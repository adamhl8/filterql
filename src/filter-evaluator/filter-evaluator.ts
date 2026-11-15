import { BaseEvaluator } from "#base-evaluator.ts"
import type { Comparison } from "#filter-evaluator/types.ts"
import { isComparableDataValue } from "#filter-evaluator/types.ts"
import type {
  BaseComparisonOperator,
  ComparisonNode,
  ExpressionNode,
  FilterNode,
  LogicalOpNode,
  NotOpNode,
} from "#parser/parser.ts"
import type { DataObject } from "#types.ts"

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

const isEmpty = (val: unknown) => val === "" || val === undefined || val === null

export class FilterEvaluator extends BaseEvaluator {
  /** Filters the data array by evaluating the AST node against each data object */
  public filter<T extends DataObject>(data: T[], node: FilterNode): T[] {
    return data.filter((item) => this.evaluateFilter(node, item))
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

  /** Resolves the field/alias and validates it against the schema */
  private resolveComparison(node: ComparisonNode): Comparison {
    // field is either the full field name or an alias
    const field = this.resolveField(node.field) ?? node.field
    const fieldConfig = this.schema[field]

    const isCaseInsensitive = node.operator.startsWith("i")
    // Remove 'i' prefix
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion - A ComparisonOperator without the 'i' prefix is guaranteed to be a valid BaseComparisonOperator
    const operator = (isCaseInsensitive ? node.operator.slice(1) : node.operator) as BaseComparisonOperator

    const { value } = node

    const isEmptyCheck = operator === "==" || operator === "!="
    if (value === "" && !isEmptyCheck) {
      throw new FilterEvaluatorError(
        `The '${node.operator}' operator can't be used with an empty check (field '${field}'). Empty checks must use '==' or '!='.`,
      )
    }

    const isValidNumber = parseNumber(value) !== undefined

    // this check is not specific to any field type, but rather a general rule for numeric operators
    const isNumericOperator = operator === ">=" || operator === "<="
    if (isNumericOperator && !isValidNumber) {
      throw new FilterEvaluatorError(
        `Invalid value '${value}' for field '${field}': the '${operator}' operator must be used with a number`,
      )
    }

    if (!fieldConfig) {
      // if the field isn't in the schema and allowUnknownFields is true, give the field back as is
      if (this.options.allowUnknownFields) return { field, isCaseInsensitive, operator, value }
      throw new FilterEvaluatorError(`Unknown field '${field}'`)
    }

    // `""` only gets here with `==` or `!=`, and an empty check is valid for every field type.
    if (value === "") return { field, isCaseInsensitive, operator, value }

    const { type } = fieldConfig

    // we don't need to check for type === "string" because it's always valid

    if (type === "number" && !isValidNumber)
      throw new FilterEvaluatorError(`Invalid value '${value}' for field '${field}' (${type})`)

    if (type === "boolean") {
      const lower = value.toLowerCase()
      if (lower !== "true" && lower !== "false")
        throw new FilterEvaluatorError(`Invalid value '${value}' for field '${field}' (${type})`)
    }

    return { field, isCaseInsensitive, operator, value }
  }

  private evaluateComparison(node: ComparisonNode, data: DataObject): boolean {
    const { field, operator, value, isCaseInsensitive } = this.resolveComparison(node)

    // if the data doesn't have the field at all, it shouldn't be matched
    if (!Object.hasOwn(data, field)) return false

    const dataValue = data[field]

    // we only want to compare against string, number, boolean, undefined, or null values
    if (!isComparableDataValue(dataValue)) return false

    // `resolveComparison()` only allows `""` with `==` or `!=`, so this is an empty check.
    if (value === "") return operator === "==" ? isEmpty(dataValue) : !isEmpty(dataValue)

    // Below, we coerce dataValue to a string. If dataValue is undefined/null, a query like 'field == undefined' will match, which we don't want
    // To be clear, a query like 'field == undefined' is a query for the *string* "undefined", not a literal undefined value
    // This check must come after the empty check, since that's the correct way to check for a ""/undefined/null value
    if (isEmpty(dataValue)) return false

    const handleCaseSensitivity = (val: string) => (isCaseInsensitive ? val.toLowerCase() : val)
    const valueString = handleCaseSensitivity(value)
    const dataValueString = handleCaseSensitivity(String(dataValue))

    if (operator === "==") return dataValueString === valueString
    if (operator === "!=") return dataValueString !== valueString
    if (operator === "*=") return dataValueString.includes(valueString)
    if (operator === "^=") return dataValueString.startsWith(valueString)
    if (operator === "$=") return dataValueString.endsWith(valueString)
    if (operator === "~=") {
      try {
        const flags = isCaseInsensitive ? "i" : ""
        // using valueString/dataValueString (which might be lowercase) wouldn't make sense here
        const regex = new RegExp(value, flags)
        return regex.test(String(dataValue))
      } catch {
        return false
      }
    }

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
