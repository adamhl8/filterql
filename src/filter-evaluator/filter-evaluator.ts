import { BaseEvaluator } from "#base-evaluator.ts"
import type { Comparison } from "#filter-evaluator/types.ts"
import { groupFieldTypes, isComparableDataValue, operatorGroups } from "#filter-evaluator/types.ts"
import type {
  BaseComparisonOperator,
  ComparisonNode,
  ExpressionNode,
  FilterNode,
  LogicalOpNode,
  NotOpNode,
} from "#parser/parser.ts"
import type { DataObject, FieldType } from "#types.ts"

class FilterEvaluatorError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "FilterEvaluatorError"
  }
}

/** Parses a finite decimal number, or returns `undefined`. */
const parseNumber = (value: string): number | undefined => {
  const parsedNumber = Number(value)
  // oxlint-disable-next-line unicorn/prefer-number-coercion - `parseFloat()` rejects `""`, whitespace, and hex, binary, or octal literals, which `Number()` accepts
  return Number.isFinite(parsedNumber) && parsedNumber === Number.parseFloat(value) ? parsedNumber : undefined
}

/** Converts a data value to a finite number, or returns `undefined` if it can't. */
const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") return parseNumber(value)
  return undefined
}

/** Parses `true` or `false` in any case, or returns `undefined`. */
const parseBoolean = (value: string): boolean | undefined => {
  const lower = value.toLowerCase()
  if (lower === "true") return true
  if (lower === "false") return false
  return undefined
}

/** Converts a data value to a boolean, or returns `undefined` if it can't. */
const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return parseBoolean(value)
  return undefined
}

/** Converts a query value to the field type, or returns `undefined` if it can't. */
const convertToFieldType = (value: string, type: FieldType): string | number | boolean | undefined => {
  if (type === "number") return parseNumber(value)
  if (type === "boolean") return parseBoolean(value)
  return value
}

/** Compiles a `~=` pattern, and throws if it isn't a valid regex. */
const compileRegex = (pattern: string, isCaseInsensitive: boolean, field: string): RegExp => {
  try {
    return new RegExp(pattern, isCaseInsensitive ? "i" : "")
  } catch {
    throw new FilterEvaluatorError(`Invalid regex '${pattern}' for field '${field}'`)
  }
}

const isEmpty = (val: unknown) => val === "" || val === undefined || val === null

export class FilterEvaluator extends BaseEvaluator {
  /** Filters the data array by evaluating the AST node against each data object */
  public filter<T extends DataObject>(data: T[], node: FilterNode): T[] {
    // Compile before filtering so an invalid filter throws even when `data` is empty.
    this.compile(node)
    return data.filter((item) => this.evaluateFilter(node, item))
  }

  // Cache resolved comparisons because `evaluateFilter()` runs once per row.
  private readonly comparisons = new WeakMap<ComparisonNode, Comparison>()

  private getComparison(node: ComparisonNode): Comparison {
    const cached = this.comparisons.get(node)
    if (cached) return cached

    const comparison = this.compileComparison(node)
    this.comparisons.set(node, comparison)
    return comparison
  }

  /** Compiles and validates every comparison in the filter, and throws if one is invalid. */
  public compile(node: FilterNode): void {
    this.compileExpression(node.expression)
  }

  private compileExpression(node: ExpressionNode): void {
    if (node.type === "match_all") return
    if (node.type === "comparison") {
      // Compile no matter what instead of using `getComparison()` because the caller may have changed the node.
      this.comparisons.set(node, this.compileComparison(node))
      return
    }
    if (node.type === "not") {
      this.compileExpression(node.operand)
      return
    }
    this.compileExpression(node.left)
    this.compileExpression(node.right)
  }

  /** Resolves the field/alias and validates it against the schema */
  private compileComparison(node: ComparisonNode): Comparison {
    // field is either the full field name or an alias
    const field = this.resolveField(node.field) ?? node.field
    const fieldConfig = this.schema[field]
    if (!fieldConfig && !this.options.allowUnknownFields) throw new FilterEvaluatorError(`Unknown field '${field}'`)

    const isCaseInsensitive = node.operator.startsWith("i")
    // Remove 'i' prefix
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion - A ComparisonOperator without the 'i' prefix is guaranteed to be a valid BaseComparisonOperator
    const operator = (isCaseInsensitive ? node.operator.slice(1) : node.operator) as BaseComparisonOperator

    const group = operatorGroups[operator]
    const { value } = node

    const allowedFieldTypes = groupFieldTypes[group]
    if (fieldConfig && !allowedFieldTypes.includes(fieldConfig.type)) {
      throw new FilterEvaluatorError(
        `The '${node.operator}' operator can't be used on ${fieldConfig.type} field '${field}'`,
      )
    }

    // An empty check is an equality check against nothing.
    if (value === "" && group !== "equality") {
      throw new FilterEvaluatorError(
        `The '${node.operator}' operator can't be used with an empty check (field '${field}'). Empty checks must use '==' or '!='.`,
      )
    }

    const resolvedValue = isCaseInsensitive ? value.toLowerCase() : value
    const baseComparison = { field, isCaseInsensitive, value: resolvedValue }
    const comparison: Comparison =
      operator === "~="
        ? { ...baseComparison, operator, regex: compileRegex(value, isCaseInsensitive, field) }
        : { ...baseComparison, operator }

    // Return before the type check, because `""` isn't a valid number or boolean.
    if (value === "") return comparison

    // Require a number on every field type, because range operators only compare numerically.
    if (group === "range" && parseNumber(value) === undefined) {
      throw new FilterEvaluatorError(
        `Invalid value '${value}' for field '${field}': the '${operator}' operator must be used with a number`,
      )
    }

    // Unknown fields have no declared type to check the value against.
    if (!fieldConfig) return comparison

    // Skip the type check for pattern operators, because they match the value's text.
    if (group === "pattern") return comparison

    const convertedValue = convertToFieldType(resolvedValue, fieldConfig.type)
    if (convertedValue === undefined)
      throw new FilterEvaluatorError(`Invalid value '${value}' for field '${field}' (${fieldConfig.type})`)

    comparison.value = convertedValue
    return comparison
  }

  /** Evaluate a FilterNode against a data object */
  public evaluateFilter(node: FilterNode, data: DataObject): boolean {
    return this.evaluateExpression(node.expression, data)
  }

  private evaluateExpression(node: ExpressionNode, data: DataObject): boolean {
    if (node.type === "match_all") return true
    else if (node.type === "comparison") return this.evaluateComparison(node, data)
    else if (node.type === "not") return this.evaluateNot(node, data)
    // `node.type` is either "and" or "or"
    return this.evaluateLogical(node, data)
  }

  // oxlint-disable-next-line complexity - keep the matching for every field type in one place, as a flat list of early returns
  private evaluateComparison(node: ComparisonNode, data: DataObject): boolean {
    const comparison = this.getComparison(node)
    const { field, operator, value, isCaseInsensitive } = comparison

    // if the data doesn't have the field at all, it shouldn't be matched
    if (!Object.hasOwn(data, field)) return false

    const dataValue = data[field]

    // we only want to compare against string, number, boolean, undefined, or null values
    if (!isComparableDataValue(dataValue)) return false

    // `compileComparison()` only allows `""` with `==` or `!=`, so this is an empty check.
    if (value === "") return operator === "==" ? isEmpty(dataValue) : !isEmpty(dataValue)

    // Below, we coerce dataValue to a string. If dataValue is undefined/null, a query like 'field == undefined' will match, which we don't want
    // To be clear, a query like 'field == undefined' is a query for the *string* "undefined", not a literal undefined value
    // This check must come after the empty check, since that's the correct way to check for a ""/undefined/null value
    if (isEmpty(dataValue)) return false

    if (typeof value === "number") {
      const dataNumber = toNumber(dataValue)
      // Data that can't be converted can't be compared.
      if (dataNumber === undefined) return false
      if (operator === "==") return dataNumber === value
      if (operator === "!=") return dataNumber !== value
      if (operator === ">=") return dataNumber >= value
      return dataNumber <= value
    }

    if (typeof value === "boolean") {
      const dataBoolean = toBoolean(dataValue)
      // Data that can't be converted can't be compared.
      if (dataBoolean === undefined) return false
      // Boolean fields only allow `==` and `!=`.
      return operator === "==" ? dataBoolean === value : dataBoolean !== value
    }

    // `compileComparison()` already lowercased `value` for case-insensitive comparisons.
    const dataString = isCaseInsensitive ? String(dataValue).toLowerCase() : String(dataValue)

    if (operator === "==") return dataString === value
    if (operator === "!=") return dataString !== value
    if (operator === "*=") return dataString.includes(value)
    if (operator === "^=") return dataString.startsWith(value)
    if (operator === "$=") return dataString.endsWith(value)
    // Test the original text, because `i~=` uses the `i` regex flag.
    if (operator === "~=") return comparison.regex.test(String(dataValue))

    const valueNumber = Number(value)
    const dataValueNumber = Number(dataValue)
    if (operator === ">=") return dataValueNumber >= valueNumber
    // operator === "<="
    return dataValueNumber <= valueNumber
  }

  private evaluateLogical(node: LogicalOpNode, data: DataObject): boolean {
    const leftResult = this.evaluateExpression(node.left, data)
    const rightResult = this.evaluateExpression(node.right, data)

    return node.type === "and" ? leftResult && rightResult : leftResult || rightResult
  }

  private evaluateNot(node: NotOpNode, data: DataObject): boolean {
    return !this.evaluateExpression(node.operand, data)
  }
}
