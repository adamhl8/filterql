import type { Entries } from "type-fest"

import type { Token } from "~/lexer/types.js"
import { comparisonOperatorCharacters, comparisonOperators, reservedCharacters, tokenTypeMap } from "~/lexer/types.js"

const WHITESPACE = /\s/

export class Lexer {
  private readonly input: string
  /**
   * The `this.#position` property should never need to be accessed directly. Use `this.position` to get the current position or `this.advanceBy` to adjust the position.
   *
   * This allows us to guarantee that `this.current` is always updated along with `this.#position`.
   */
  #position = 0
  private current: string

  /**
   * Each token type has a corresponding handler function that returns the value for the token or `undefined`.
   * Returning `undefined` indicates that `this.current` is not a valid token for the current token type, and the lexer should try the next token type.
   *
   * Each handler is responsible for advancing the lexer's position.
   */
  private readonly tokenHandlers = {
    IDENTIFIER: () => {
      let identifier = ""

      while (this.position < this.input.length && !reservedCharacters.includes(this.current)) {
        // edge case: don't consume 'i' if it's followed by an operator
        const next = this.peek()
        if (this.current === "i" && comparisonOperatorCharacters.includes(next)) break

        identifier += this.current
        this.advanceBy(1)
      }

      if (identifier) return identifier
      return
    },
    COMPARISON_OPERATOR: () => {
      let operator = ""

      // handle case-insensitive operator
      if (this.current === "i") {
        const next = this.peek()
        if (comparisonOperatorCharacters.includes(next)) {
          operator += "i"
          this.advanceBy(1)
        }
      }

      for (const op of comparisonOperators) {
        if (this.matchesString(op)) {
          operator += op
          this.advanceBy(op.length)
          return operator
        }
      }

      // If we consumed 'i' but found no operator, we need to backtrack
      if (operator === "i") this.advanceBy(-1)

      return
    },
    QUOTED_VALUE: () => {
      const QUOTE_CHAR = tokenTypeMap.QUOTED_VALUE
      const BACKSLASH_CHAR = "\\"
      if (this.current !== QUOTE_CHAR) return

      let value = ""
      this.advanceBy(1) // Skip opening quote

      while (this.position < this.input.length && this.current !== QUOTE_CHAR) {
        if (this.current === BACKSLASH_CHAR) {
          // Handle escaped characters
          this.advanceBy(1)
          if (this.current === QUOTE_CHAR) value += this.current
          else value += `${BACKSLASH_CHAR}${this.current}`
        } else {
          value += this.current
        }
        this.advanceBy(1)
      }

      if (this.current !== QUOTE_CHAR) throw new LexerError(`Unterminated string at position ${this.position}`)

      this.advanceBy(1) // Skip closing quote
      return value // an empty quoted value is valid, so we don't return undefined here even if it's empty
    },
    LPAREN: () => {
      const lparen = tokenTypeMap.LPAREN
      if (!this.matchesString(lparen)) return

      this.advanceBy(lparen.length)
      return lparen
    },
    RPAREN: () => {
      const rparen = tokenTypeMap.RPAREN
      if (!this.matchesString(rparen)) return

      this.advanceBy(rparen.length)
      return rparen
    },
    NOT: () => {
      const not = tokenTypeMap.NOT
      if (!this.matchesString(not)) return

      this.advanceBy(not.length)
      return not
    },
    AND: () => {
      const and = tokenTypeMap.AND
      if (!this.matchesString(and)) return

      this.advanceBy(and.length)
      return and
    },
    OR: () => {
      const or = tokenTypeMap.OR
      if (!this.matchesString(or)) return

      this.advanceBy(or.length)
      return or
    },
    // biome-ignore lint/nursery/noUselessUndefined: EOF should never match
    EOF: () => undefined,
  } satisfies Record<keyof typeof tokenTypeMap, () => string | undefined>

  public constructor(input: string) {
    this.input = input
    this.current = input[0] ?? ""
  }

  public tokenize(): Token[] {
    const tokens: Token[] = []

    while (this.position < this.input.length) {
      this.skipWhitespace()
      if (this.position >= this.input.length) break

      const token = this.nextToken()
      tokens.push(token)
    }

    tokens.push({ type: "EOF", value: "", position: this.position })
    return tokens
  }

  private nextToken(): Token {
    const tokenStart = this.position

    for (const [tokenType, handler] of Object.entries(this.tokenHandlers) as Entries<typeof this.tokenHandlers>) {
      const tokenValue = handler()
      if (tokenValue !== undefined) return { type: tokenType, value: tokenValue, position: tokenStart }
    }

    throw new LexerError(`Unexpected character '${this.current}' at position ${this.position}`)
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && WHITESPACE.test(this.current)) {
      this.advanceBy(1)
    }
  }

  private get position(): number {
    return this.#position
  }

  private advanceBy(count: number) {
    this.#position += count
    this.current = this.input[this.position] ?? ""
  }

  private peek(): string {
    return this.input[this.position + 1] ?? ""
  }

  private matchesString(str: string): boolean {
    return this.input.slice(this.position, this.position + str.length) === str
  }
}

class LexerError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "LexerError"
  }
}
