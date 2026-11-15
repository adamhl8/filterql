import { BaseEvaluator } from "#base-evaluator.ts"
import type { Comparison } from "#filter-evaluator/types.ts"
import {
  FilterEvaluatorError,
  groupFieldTypes,
  isComparableDataValue,
  operatorGroups,
} from "#filter-evaluator/types.ts"
import {
  compileRegex,
  convertComparisonValue,
  fieldTypeOf,
  isEmpty,
  toBoolean,
  toNumber,
} from "#filter-evaluator/values.ts"
import type {
  BaseComparisonOperator,
  ComparisonNode,
  ExpressionNode,
  FilterNode,
  LogicalOpNode,
  NotOpNode,
} from "#parser/parser.ts"
import type { DataObject } from "#types.ts"

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

    const regex = operator === "~=" ? compileRegex(value, isCaseInsensitive, field) : undefined
    const isUnknownField = !fieldConfig
    const resolvedValue = isCaseInsensitive ? value.toLowerCase() : value
    const comparison: Comparison = {
      field,
      operator,
      isCaseInsensitive,
      regex,
      isUnknownField,
      value: resolvedValue,
    }

    // Unknown fields have no declared type, so their query value converts to the data value's type on each row.
    if (isUnknownField) return comparison

    // Return before the type check, because `""` isn't a valid number or boolean.
    if (value === "") return comparison

    const convertedValue = convertComparisonValue(resolvedValue, fieldConfig.type, group)
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
    const { field, operator, isCaseInsensitive, regex, isUnknownField, value: compiledValue } = this.getComparison(node)

    // if the data doesn't have the field at all, it shouldn't be matched
    if (!Object.hasOwn(data, field)) return false

    const dataValue = data[field]

    // we only want to compare against string, number, boolean, undefined, or null values
    if (!isComparableDataValue(dataValue)) return false

    // `compileComparison()` only allows `""` with `==` or `!=`, so this is an empty check.
    if (compiledValue === "") return operator === "==" ? isEmpty(dataValue) : !isEmpty(dataValue)

    // Below, we coerce dataValue to a string. If dataValue is undefined/null, a query like 'field == undefined' would match, which we don't want
    // To be clear, a query like 'field == undefined' is a query for the *string* "undefined", not a literal undefined value
    // This check must come after the empty check, since that's the correct way to check for a ""/undefined/null value
    if (isEmpty(dataValue)) return false

    const comparisonValue = isUnknownField
      ? convertComparisonValue(compiledValue, fieldTypeOf(dataValue), operatorGroups[operator])
      : compiledValue

    // An unknown field's query value that can't convert to the data value's type can't be compared.
    if (comparisonValue === undefined) return false

    if (typeof comparisonValue === "number") {
      const dataNumber = toNumber(dataValue)
      // Data that can't be converted can't be compared.
      if (dataNumber === undefined) return false
      if (operator === "==") return dataNumber === comparisonValue
      if (operator === "!=") return dataNumber !== comparisonValue
      if (operator === ">=") return dataNumber >= comparisonValue
      return dataNumber <= comparisonValue
    }

    if (typeof comparisonValue === "boolean") {
      const dataBoolean = toBoolean(dataValue)
      // Data that can't be converted can't be compared.
      if (dataBoolean === undefined) return false
      // Only equality operators get a boolean query value.
      return operator === "==" ? dataBoolean === comparisonValue : dataBoolean !== comparisonValue
    }

    // `compileComparison()` already lowercased `compiledValue` for case-insensitive comparisons.
    const dataString = isCaseInsensitive ? String(dataValue).toLowerCase() : String(dataValue)

    if (operator === "==") return dataString === comparisonValue
    if (operator === "!=") return dataString !== comparisonValue
    if (operator === "*=") return dataString.includes(comparisonValue)
    if (operator === "^=") return dataString.startsWith(comparisonValue)
    if (operator === "$=") return dataString.endsWith(comparisonValue)
    // Test the original string, because `i~=` uses the `i` regex flag.
    if (regex) return regex.test(String(dataValue))

    // Compare alphabetically, by code unit order.
    if (operator === ">=") return dataString >= comparisonValue
    return dataString <= comparisonValue
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
