import type { Comparison, Data, EvaluatorOptions, Schema } from "~/evaluator/types.js"
import type { ASTNode, BaseComparisonOperator, ComparisonNode, LogicalOpNode, NotOpNode } from "~/parser/types.js"

export class Evaluator {
  private readonly schema: Schema
  private readonly fieldMap: Map<string, string> // alias/field -> canonical field
  private readonly options: EvaluatorOptions

  public constructor(schema: Schema, options: EvaluatorOptions) {
    this.schema = schema
    this.options = options

    this.fieldMap = new Map()
    for (const [field, config] of Object.entries(schema)) {
      if (this.fieldMap.has(field)) throw new Error(`Duplicate field '${field}' in schema`)
      this.fieldMap.set(field, field) // field maps to itself

      if (config.alias) {
        if (this.fieldMap.has(config.alias)) throw new Error(`Duplicate field alias '${config.alias}' in schema`)
        this.fieldMap.set(config.alias, field) // alias maps to field
      }
    }
  }

  /**
   * Evaluate an AST node against a data object
   */
  public evaluate(node: ASTNode, data: Data): boolean {
    switch (node.type) {
      case "comparison":
        return this.evaluateComparison(node, data)
      case "and":
        return this.evaluateLogical(node, data)
      case "or":
        return this.evaluateLogical(node, data)
      case "not":
        return this.evaluateNot(node, data)
      default:
        throw new EvaluationError(`Unexpected node '${JSON.stringify(node)}'`)
    }
  }

  /**
   * Resolves the field/alias and validates it against the schema
   */
  private resolveComparison(node: ComparisonNode): Comparison {
    // field is either the full field name or an alias
    const field = this.fieldMap.get(node.field) ?? node.field
    const fieldConfig = this.schema[field]

    const isCaseInsensitive = node.operator.startsWith("i")
    // Remove 'i' prefix
    const operator = (isCaseInsensitive ? node.operator.slice(1) : node.operator) as BaseComparisonOperator

    const value = node.value
    const isValidNumber = isNumber(value)

    // this check is not specific to any field type, but rather a general rule for numeric operators
    const isNumericOperator = [">=", "<="].includes(operator)
    if (isNumericOperator && !isValidNumber)
      throw new EvaluationError(
        `Invalid value '${value}' for field '${field}': the '${operator}' operator must be used with a number`,
      )

    if (!fieldConfig) {
      // if the field isn't in the schema and allowUnknownFields is true, give the field back as is
      if (this.options.allowUnknownFields) return { field, operator, value, isCaseInsensitive }
      throw new EvaluationError(`Unknown field '${field}'`)
    }

    const { type } = fieldConfig

    // we don't need to check for type === "string" because it's always valid

    if (type === "number" && !isValidNumber)
      throw new EvaluationError(`Invalid value '${value}' for field '${field}' (${type})`)

    if (type === "boolean") {
      const lower = value.toLowerCase()
      if (lower !== "true" && lower !== "false")
        throw new EvaluationError(`Invalid value '${value}' for field '${field}' (${type})`)
    }

    return { field, operator, value, isCaseInsensitive }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ignore
  private evaluateComparison(node: ComparisonNode, data: Data): boolean {
    const { field, operator, value, isCaseInsensitive } = this.resolveComparison(node)

    // if the data doesn't have the field at all, it shouldn't be matched
    if (!Object.hasOwn(data, field)) return false

    const dataValue = data[field]

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

    throw new EvaluationError(`Unexpected comparison operator '${operator}'`)
  }

  private evaluateLogical(node: LogicalOpNode, data: Data): boolean {
    const leftResult = this.evaluate(node.left, data)
    const rightResult = this.evaluate(node.right, data)

    switch (node.type) {
      case "and":
        return leftResult && rightResult
      case "or":
        return leftResult || rightResult
      default:
        throw new EvaluationError(`Unexpected logical operator '${node.type}'`)
    }
  }

  private evaluateNot(node: NotOpNode, data: Data): boolean {
    return !this.evaluate(node.operand, data)
  }
}

class EvaluationError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "EvaluationError"
  }
}

function isNumber(num: string) {
  const parsedNumber = Number(num)
  return !Number.isNaN(parsedNumber)
}
