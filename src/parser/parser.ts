import type { Token } from "~/lexer/types.js"
import type { ASTNode, ComparisonNode, ExpressionNode, FilterNode, OperationNode } from "~/parser/types.js"
import { isComparisonOperator } from "~/parser/types.js"

export class Parser {
  private tokens: Token[] = []
  private position = 0
  #current: Token | undefined

  /**
   * Parse tokens into an AST following the grammar:
   *
   * query := filter ( "|" operation )*
   * filter := expr
   * operation := operation_name arg*
   * expr := and_expr ( "||" and_expr )*
   * and_expr := term ( "&&" term )*
   * term := "!" term | "(" expr ")" | comparison
   * comparison := field operator value | field | "*"
   */
  public parse(tokens: Token[]): ASTNode {
    this.tokens = tokens
    this.#current = this.tokens[0]

    const filter = this.parseFilter()
    const operations = this.parseOperations()

    if (this.current().type !== "EOF")
      throw new ParserError(`Unexpected token '${this.current().value}' at position ${this.current().position}`)

    return {
      type: "query",
      filter,
      operations,
    }
  }

  /**
   * filter := expr
   */
  private parseFilter(): FilterNode {
    const expression = this.parseExpression()
    return {
      type: "filter",
      expression,
    }
  }

  /**
   * expr := and_expr ( "||" and_expr )*
   */
  private parseExpression(): ExpressionNode {
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
  private parseAndExpression(): ExpressionNode {
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
  private parseTerm(): ExpressionNode {
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

    if (this.current().type === "MATCH_ALL") {
      this.advance() // consume *
      return { type: "match_all" }
    }

    return this.parseComparison()
  }

  /**
   * comparison := field operator value | field
   * Note: standalone field is shorthand for field == true
   */
  private parseComparison(): ComparisonNode {
    const fieldToken = this.current()
    if (fieldToken.type !== "FIELD")
      throw new ParserError(`Expected field name but found '${fieldToken.value}' at position ${fieldToken.position}`)
    this.advance()

    const operatorToken = this.current()
    // if no comparison operator follows, this is a boolean field shorthand: field -> field == true
    // we use the type guard here instead of checking operatorToken.type so we can narrow the type of operatorToken.value
    if (!isComparisonOperator(operatorToken.value))
      return { type: "comparison", field: fieldToken.value, operator: "==", value: "true" }
    this.advance()

    const valueToken = this.current()
    if (valueToken.type !== "VALUE")
      throw new ParserError(`Expected value but found '${valueToken.value}' at position ${valueToken.position}`)
    this.advance()

    return { type: "comparison", field: fieldToken.value, operator: operatorToken.value, value: valueToken.value }
  }

  /**
   * Parse operations: ( "|" operation )*
   */
  private parseOperations(): OperationNode[] {
    const operations: OperationNode[] = []

    while (this.current().type === "PIPE") {
      this.advance() // consume |
      const operation = this.parseOperation()
      operations.push(operation)
    }

    return operations
  }

  /**
   * operation := operation_name arg*
   */
  private parseOperation(): OperationNode {
    const operationNameToken = this.current()
    if (operationNameToken.type !== "OPERATION_NAME")
      throw new ParserError(
        `Expected operation name but found '${operationNameToken.value}' at position ${operationNameToken.position}`,
      )
    this.advance()

    const args: string[] = []
    while (this.current().type === "OPERATION_ARGUMENT") {
      args.push(this.current().value)
      this.advance()
    }

    return {
      type: "operation",
      name: operationNameToken.value,
      args,
    }
  }

  private current(): Token {
    if (!this.#current) throw new ParserError("current token is undefined")
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
