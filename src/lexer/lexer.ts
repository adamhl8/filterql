import type { Entries } from "type-fest"

import type { Token } from "~/lexer/types.js"
import { comparisonOperators, isTerminator, tokenTypeMap } from "~/lexer/types.js"

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
  private readonly tokens: Token[] = []

  /**
   * Each token type has a corresponding handler function that returns the value for the token or `undefined`.
   * Returning `undefined` indicates that `this.current` is not a valid token for the current token type, and the lexer should try the next token type.
   *
   * Each handler is responsible for advancing the lexer's position.
   */
  private readonly tokenHandlers = {
    FIELD: () => {
      let field = ""
      let backtrackCount = 0

      while (this.position < this.input.length && !isTerminator(this.current + this.peekBy(1))) {
        // don't consume 'i' if it's followed by an operator
        const next = this.peekBy(2)
        if (this.current === "i" && comparisonOperators.some((op) => next === op)) break

        field += this.current
        this.advanceBy(1)
        backtrackCount--
      }

      const previousToken = this.tokens.at(-1)
      // VALUE tokens are *always* preceded by a comparison operator
      // if this is true, then the field is actually a value
      if (previousToken && previousToken.type === "COMPARISON_OPERATOR") {
        this.advanceBy(backtrackCount)
        return
      }

      if (field) return field
      return
    },
    COMPARISON_OPERATOR: () => {
      let operator = ""

      // handle case-insensitive operator
      if (this.current === "i") {
        const next = this.peekBy(2)
        if (comparisonOperators.some((op) => next === op)) {
          // We need to handle an ambiguous query like 'i== value'. Is this supposed to be 'i == value' or 'i== value' (missing field)?
          // To handle this, case-insensitive operators must be preceded by whitespace.
          const isAtStart = this.position === 0
          if (isAtStart)
            throw new LexerError(
              `Ambiguous syntax 'i${next}' at position ${this.position}: field is missing or you meant 'i ${next}'`,
            )

          const prevChar = this.peekBy(-1)
          const precededByWhitespace = WHITESPACE.test(prevChar)
          if (!precededByWhitespace)
            throw new LexerError(
              `Ambiguous syntax 'i${next}' at position ${this.position}: case-insensitive operators must be preceded by whitespace`,
            )

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
    VALUE: () => {
      let value = ""

      while (this.position < this.input.length && !isTerminator(this.current + this.peekBy(1))) {
        value += this.current
        this.advanceBy(1)
      }

      if (value) return value
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
    while (this.position < this.input.length) {
      this.skipWhitespace()
      if (this.position >= this.input.length) break

      const token = this.nextToken()
      this.tokens.push(token)
    }

    this.tokens.push({ type: "EOF", value: "", position: this.position })
    return this.tokens
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

  private peekBy(count: number): string {
    if (count < 0) return this.input.slice(this.position + count, this.position)
    // slice returns from the start index up to but *not* including the end index
    // e.g. say the input is "bar" and we're at position 1 ("a"), we would want peekBy(1) to return "r". So we want position 2 up to and including 2.
    // In other words, we want to start at the *next* position, and end at the next position + count. i.e. "bar".slice(2, 3) -> "r"
    // Note: an out of bounds end index is fine, slice always stops at the end of the string
    const nextPosition = this.position + 1
    return this.input.slice(nextPosition, nextPosition + count)
  }

  private matchesString(str: string): boolean {
    return this.input.slice(this.position, this.position + str.length) === str
  }
}

export class LexerError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "LexerError"
  }
}
