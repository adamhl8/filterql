import type { Token } from "~/lexer/types.js"
import type { ASTNode, ComparisonNode } from "~/parser/types.js"
import { isComparisonOperator } from "~/parser/types.js"

export class Parser {
  private readonly tokens: Token[]
  private position = 0
  #current: Token

  public constructor(tokens: Token[]) {
    this.tokens = tokens
    const firstToken = tokens[0]
    if (!firstToken) throw new ParserError("Unexpected empty token array") // this should never happen when tokens are provided by the lexer, there's always an EOF token
    this.#current = firstToken
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
      throw new ParserError(`Unexpected token '${this.current().value}' at position ${this.current().position}`)

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
        throw new ParserError(`Expected ')' but found '${this.current().value}' at position ${this.current().position}`)
      this.advance() // consume )
      return expr
    }

    return this.parseComparison()
  }

  /**
   * comparison := field operator value | field
   * Note: standalone field is shorthand for field == true
   */
  private parseComparison(): ComparisonNode {
    const fieldToken = this.current()
    if (fieldToken.type !== "IDENTIFIER")
      throw new ParserError(
        `Expected field name but found '${this.current().value}' at position ${this.current().position}`,
      )

    this.advance()

    // Check if this is a boolean field (no operator follows)
    if (this.current().type !== "COMPARISON_OPERATOR") {
      // Boolean field shorthand: field -> field == true
      return { type: "comparison", field: fieldToken.value, operator: "==", value: "true" }
    }

    const operatorToken = this.current()
    if (!isComparisonOperator(operatorToken.value))
      throw new ParserError(
        `Expected comparison operator but found '${operatorToken.value}' at position ${this.current().position}`,
      )

    this.advance()

    const valueToken = this.current()
    if (valueToken.type !== "IDENTIFIER" && valueToken.type !== "QUOTED_VALUE")
      throw new ParserError(`Expected value but found '${valueToken.value}' at position ${valueToken.position}`)

    this.advance()

    return { type: "comparison", field: fieldToken.value, operator: operatorToken.value, value: valueToken.value }
  }

  private current(): Token {
    return this.#current
  }

  private advance() {
    if (this.position < this.tokens.length - 1) {
      this.position++
      const token = this.tokens[this.position]
      if (!token) throw new ParserError("Unexpected end of tokens")
      this.#current = token
    }
  }
}

class ParserError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "ParserError"
  }
}
