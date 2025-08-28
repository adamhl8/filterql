import { BaseEvaluator } from "~/base-evaluator.js"
import type { Comparison } from "~/filter-evaluator/types.js"
import { isComparableDataValue } from "~/filter-evaluator/types.js"
import type {
  BaseComparisonOperator,
  ComparisonNode,
  ExpressionNode,
  FilterNode,
  LogicalOpNode,
  NotOpNode,
} from "~/parser/types.js"
import type { DataObject } from "~/types.js"

export class FilterEvaluator extends BaseEvaluator {
  /**
   * Filters the data array by evaluating the AST node against each data object
   */
  public filter<T extends DataObject>(data: T[], node: FilterNode): T[] {
    return data.filter((item) => this.evaluateFilter(node, item))
  }

  /**
   * Evaluate a FilterNode against a data object
   */
  public evaluateFilter(node: FilterNode, data: DataObject): boolean {
    return this.evaluateExpression(node.expression, data)
  }

  private evaluateExpression(node: ExpressionNode, data: DataObject): boolean {
    switch (node.type) {
      case "match_all":
        return true
      case "comparison":
        return this.evaluateComparison(node, data)
      case "and":
        return this.evaluateLogical(node, data)
      case "or":
        return this.evaluateLogical(node, data)
      case "not":
        return this.evaluateNot(node, data)
      default:
        throw new FilterEvaluatorError(`Unexpected node '${JSON.stringify(node)}'`)
    }
  }

  /**
   * Resolves the field/alias and validates it against the schema
   */
  private resolveComparison(node: ComparisonNode): Comparison {
    // field is either the full field name or an alias
    const field = this.resolveField(node.field) ?? node.field
    const fieldConfig = this.schema[field]

    const isCaseInsensitive = node.operator.startsWith("i")
    // Remove 'i' prefix
    const operator = (isCaseInsensitive ? node.operator.slice(1) : node.operator) as BaseComparisonOperator

    const value = node.value
    const isValidNumber = isNumber(value)

    // this check is not specific to any field type, but rather a general rule for numeric operators
    const isNumericOperator = [">=", "<="].includes(operator)
    if (isNumericOperator && !isValidNumber)
      throw new FilterEvaluatorError(
        `Invalid value '${value}' for field '${field}': the '${operator}' operator must be used with a number`,
      )

    if (!fieldConfig) {
      // if the field isn't in the schema and allowUnknownFields is true, give the field back as is
      if (this.options.allowUnknownFields) return { field, operator, value, isCaseInsensitive }
      throw new FilterEvaluatorError(`Unknown field '${field}'`)
    }

    const { type } = fieldConfig

    // we don't need to check for type === "string" because it's always valid

    if (type === "number" && !isValidNumber)
      throw new FilterEvaluatorError(`Invalid value '${value}' for field '${field}' (${type})`)

    if (type === "boolean") {
      const lower = value.toLowerCase()
      if (lower !== "true" && lower !== "false")
        throw new FilterEvaluatorError(`Invalid value '${value}' for field '${field}' (${type})`)
    }

    return { field, operator, value, isCaseInsensitive }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ignore
  private evaluateComparison(node: ComparisonNode, data: DataObject): boolean {
    const { field, operator, value, isCaseInsensitive } = this.resolveComparison(node)

    // if the data doesn't have the field at all, it shouldn't be matched
    if (!Object.hasOwn(data, field)) return false

    const dataValue = data[field]

    // we only want to compare against string, number, boolean, undefined, or null values
    if (!isComparableDataValue(dataValue)) return false

    const isEmpty = (val: unknown) => val === "" || val === undefined || val === null
    // if the comparison value is "", it's an empty check
    if (value === "") {
      if (operator === "==") return isEmpty(dataValue)
      if (operator === "!=") return !isEmpty(dataValue)
      // it doesn't make sense to do empty checks with other operators
      return false
    }

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
    if (operator === "<=") return dataValueNumber <= valueNumber

    throw new FilterEvaluatorError(`Unexpected comparison operator '${operator}'`)
  }

  private evaluateLogical(node: LogicalOpNode, data: DataObject): boolean {
    const leftResult = this.evaluateExpression(node.left, data)
    const rightResult = this.evaluateExpression(node.right, data)

    switch (node.type) {
      case "and":
        return leftResult && rightResult
      case "or":
        return leftResult || rightResult
      default:
        throw new FilterEvaluatorError(`Unexpected logical operator '${node.type}'`)
    }
  }

  private evaluateNot(node: NotOpNode, data: DataObject): boolean {
    return !this.evaluateExpression(node.operand, data)
  }
}

class FilterEvaluatorError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "FilterEvaluatorError"
  }
}

function isNumber(num: string) {
  const parsedNumber = Number(num)
  return !Number.isNaN(parsedNumber)
}
