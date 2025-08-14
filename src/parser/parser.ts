import type { Token } from "~/lexer/types.js"
import type {
  ASTNode,
  ComparisonNode,
  ComparisonOperator,
  NumericComparisonNode,
  Schema,
  StringComparisonNode,
} from "~/parser/types.js"
import { isStringComparisonOperator } from "~/parser/types.js"

export class Parser {
  private readonly tokens: Token[]
  private position = 0
  #current: Token

  private readonly schema: Schema
  private readonly fieldMap: Map<string, string> // alias/field -> canonical field

  public constructor(tokens: Token[], schema: Schema) {
    this.tokens = tokens
    const firstToken = tokens[0]
    if (!firstToken) throw new Error("Unexpected empty token array") // this should never happen when tokens are provided by the lexer, there's always an EOF token
    this.#current = firstToken

    this.schema = schema
    this.fieldMap = new Map()

    for (const [field, config] of Object.entries(schema)) {
      this.fieldMap.set(field, field) // field maps to itself
      if (config.alias) this.fieldMap.set(config.alias, field) // alias maps to field
    }
  }

  /**
   * Parse tokens into an AST following the grammar:
   *
   * query := expr
   * expr := and_expr ( "||" and_expr )*
   * and_expr := term ( "&&" term )*
   * term := "!" term | "(" expr ")" | comparison
   * comparison := field operator value | field
   */
  public parse(): ASTNode {
    const result = this.parseExpression()

    if (this.current().type !== "EOF")
      throw new Error(`Unexpected token '${this.current().value}' at position ${this.current().position}`)

    return result
  }

  /**
   * expr := and_expr ( "||" and_expr )*
   */
  private parseExpression(): ASTNode {
    let left = this.parseAndExpression()

    while (this.current().type === "OR") {
      this.advance() // consume ||
      const right = this.parseAndExpression()
      left = {
        type: "or",
        left,
        right,
      }
    }

    return left
  }

  /**
   * and_expr := term ( "&&" term )*
   */
  private parseAndExpression(): ASTNode {
    let left = this.parseTerm()

    while (this.current().type === "AND") {
      this.advance() // consume &&
      const right = this.parseTerm()
      left = {
        type: "and",
        left,
        right,
      }
    }

    return left
  }

  /**
   * term := "!" term | "(" expr ")" | comparison
   */
  private parseTerm(): ASTNode {
    if (this.current().type === "NOT") {
      this.advance() // consume !
      const operand = this.parseTerm()
      return {
        type: "not",
        operand,
      }
    }

    if (this.current().type === "LPAREN") {
      this.advance() // consume (
      const expr = this.parseExpression()
      if (this.current().type !== "RPAREN")
        throw new Error(`Expected ')' but found '${this.current().value}' at position ${this.current().position}`)
      this.advance() // consume )
      return expr
    }

    // Handle comparison or boolean field
    return this.parseComparison()
  }

  /**
   * comparison := field operator value | field
   * Note: standalone field is shorthand for field == true
   */
  private parseComparison(): ASTNode {
    if (this.current().type !== "IDENTIFIER")
      throw new Error(`Expected field name but found '${this.current().value}' at position ${this.current().position}`)

    const fieldToken = this.current()
    this.advance()

    // Check if this is a boolean field (no operator follows)
    if (this.current().type !== "COMPARISON_OPERATOR") {
      // Boolean field shorthand: field -> field == true
      const equalsToken: Token = { type: "COMPARISON_OPERATOR", value: "==", position: fieldToken.position }
      const trueValueToken: Token = { type: "IDENTIFIER", value: "true", position: fieldToken.position }
      return this.resolveComparison(fieldToken, equalsToken, trueValueToken)
    }

    const operatorToken = this.current()
    this.advance()

    if (this.current().type !== "IDENTIFIER" && this.current().type !== "QUOTED_VALUE")
      throw new Error(`Expected value but found '${this.current().value}' at position ${this.current().position}`)

    const valueToken = this.current()
    this.advance()

    return this.resolveComparison(fieldToken, operatorToken, valueToken)
  }

  private current(): Token {
    return this.#current
  }

  private advance() {
    if (this.position < this.tokens.length - 1) {
      this.position++
      const token = this.tokens[this.position]
      if (!token) throw new Error("Unexpected end of tokens")
      this.#current = token
    }
  }

  /**
   * Resolve and validate the comparison
   */

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ignore
  private resolveComparison(fieldToken: Token, operatorToken: Token, valueToken: Token): ComparisonNode {
    const type = "comparison"

    const { value: fieldName, position } = fieldToken
    const field = this.fieldMap.get(fieldName) ?? ""
    const fieldConfig = this.schema[field]
    if (!fieldConfig)
      throw new ValidationError(`Unknown field '${fieldName}' at position ${position}`, fieldName, position)

    const isCaseInsensitive = operatorToken.value.startsWith("i")
    const operator = (
      isCaseInsensitive
        ? operatorToken.value.slice(1) // Remove 'i' prefix
        : operatorToken.value
    ) as ComparisonOperator

    const { value } = valueToken

    if (!isStringComparisonOperator(operator)) {
      // is numeric comparison
      const numberValue = toNumber(value)
      // numeric operators must be used with a number
      if (!numberValue) {
        throw new ValidationError(
          `Invalid value '${value}' for field '${field}' at position ${position}: the '${operator}' operator must be used with a number`,
          field,
          position,
        )
      }

      const numericComparisonNode: NumericComparisonNode = { type, field, operator, value: numberValue }
      return numericComparisonNode
    }

    const stringComparisonNode: StringComparisonNode = { type, field, operator, value, isCaseInsensitive }

    // an empty string is always valid for any field type (allows checking for empty values)
    if (value === "") return stringComparisonNode

    if (fieldConfig.type === "string") return stringComparisonNode

    if (fieldConfig.type === "number") {
      const numberValue = toNumber(value)
      if (!numberValue)
        throw new ValidationError(
          `Invalid number '${value}' for field '${field}' at position ${position}`,
          field,
          position,
        )

      return stringComparisonNode
    }

    if (fieldConfig.type === "boolean") {
      const lower = value.toLowerCase()
      if (["true", "1", "yes", "y"].includes(lower)) stringComparisonNode.value = "true"
      else if (["false", "0", "no", "n"].includes(lower)) stringComparisonNode.value = "false"
      else
        throw new ValidationError(
          `Invalid boolean '${value}' for field '${field}' at position ${position}`,
          field,
          position,
        )

      return stringComparisonNode
    }

    throw new ValidationError(
      `Unknown field type '${fieldConfig.type}' for field '${field}' at position ${position}`,
      field,
      position,
    )
  }
}

class ValidationError extends Error {
  public field: string
  public position: number

  public constructor(message: string, field: string, position: number) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "ValidationError"
    this.field = field
    this.position = position
  }
}

function toNumber(num: string) {
  const parsedNumber = Number(num)
  return Number.isNaN(parsedNumber) ? undefined : parsedNumber
}
