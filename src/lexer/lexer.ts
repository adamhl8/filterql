import type { FilterTokenType, OperationTokenType, Token, TokenType } from "~/lexer/types.ts"
import { comparisonOperators, filterTokenMap, operationTokenMap } from "~/lexer/types.ts"

interface CurrentWord {
  word: string
  rawWord: string
  isQuoted: boolean
}
type HandlerFn = (currentWord: CurrentWord, tokenStart: number) => Token | Token[] | undefined
/**
 * Each token type has a corresponding handler function that returns the Token or `undefined`. A handler can also return an array of Token if it needs to emit multiple tokens.
 *
 * Returning `undefined` or an empty array indicates that the current word is not a valid token for the current token type, and the lexer should try the next token type.
 *
 * Each handler needs to correctly handle an empty `""` string.
 */
type TokenHandlers<T extends string = string> = Record<T, HandlerFn>

const WHITESPACE = /\s/
const QUOTE_CHAR = '"'
const BACKSLASH_CHAR = "\\"

export class Lexer {
  private query = ""
  /**
   * The `this.#position` property should never need to be accessed directly. Use `this.position` to get the current position or `this.advanceBy` to adjust the position.
   *
   * This allows us to guarantee that `this.current` is always updated along with `this.#position`.
   */
  #position = 0
  private current = ""
  private readonly tokens: Token[] = []

  /**
   * We are done lexing the filter once we encounter the first PIPE token, after which we switch to the operation token handlers
   *
   * This is set to `false` when we encounter the first PIPE token
   */
  private isFilter = true

  private readonly filterTokenHandlers = {
    LPAREN: ({ word }, tokenStart) => {
      const lparen = filterTokenMap.LPAREN
      if (word !== lparen) return

      return { type: "LPAREN", value: lparen, position: tokenStart }
    },
    RPAREN: ({ word }, tokenStart) => {
      const rparen = filterTokenMap.RPAREN
      if (word !== rparen) return

      return { type: "RPAREN", value: rparen, position: tokenStart }
    },
    NOT: ({ word }, tokenStart) => {
      const not = filterTokenMap.NOT
      if (word !== not) return

      return { type: "NOT", value: not, position: tokenStart }
    },
    AND: ({ word }, tokenStart) => {
      const and = filterTokenMap.AND
      if (word !== and) return

      return { type: "AND", value: and, position: tokenStart }
    },
    OR: ({ word }, tokenStart) => {
      const or = filterTokenMap.OR
      if (word !== or) return

      return { type: "OR", value: or, position: tokenStart }
    },
    VALUE: ({ word, isQuoted }, tokenStart) => {
      // VALUE tokens can be differentiated from FIELD tokens because VALUE tokens are *always* preceded by a COMPARISON_OPERATOR
      if (this.tokens.at(-1)?.type !== "COMPARISON_OPERATOR") return

      // if the value is an empty quoted value `""`, the word will be empty
      if (!word && isQuoted) return { type: "VALUE", value: "", position: tokenStart }

      if (!word) return

      // if the value is a quoted value, we don't need to split off attached operators
      if (isQuoted) return { type: "VALUE", value: word, position: tokenStart }
      return this.tokenizeAttachedOperators(word, tokenStart, "VALUE")
    },
    COMPARISON_OPERATOR: ({ word }, tokenStart) => {
      if (!word) return

      let comparisonOperator = word

      // handle case-insensitive operator
      if (word.startsWith("i")) comparisonOperator = comparisonOperator.slice(1)

      for (const op of comparisonOperators) {
        if (comparisonOperator === op) {
          return { type: "COMPARISON_OPERATOR", value: word, position: tokenStart }
        }
      }

      return
    },
    MATCH_ALL: ({ word }, tokenStart) => {
      const matchAll = filterTokenMap.MATCH_ALL
      if (word !== matchAll) return

      return { type: "MATCH_ALL", value: word, position: tokenStart }
    },
    FIELD: ({ word }, tokenStart) => {
      if (!word) return

      return this.tokenizeAttachedOperators(word, tokenStart, "FIELD")
    },
  } satisfies TokenHandlers<FilterTokenType>

  private readonly operationTokenHandlers = {
    PIPE: ({ word }, tokenStart) => {
      const pipe = operationTokenMap.PIPE
      if (word !== pipe) return

      return { type: "PIPE", value: pipe, position: tokenStart }
    },
    OPERATION_NAME: ({ word }, tokenStart) => {
      // OPERATION_NAME tokens are *always* preceded by a PIPE. If this is true, then this isn't an OPERATION_NAME
      if (!this.isPreviousToken("PIPE")) return

      if (!word) return

      return { type: "OPERATION_NAME", value: word, position: tokenStart }
    },
    OPERATION_ARGUMENT: ({ word }, tokenStart) => {
      if (!word) return

      return { type: "OPERATION_ARGUMENT", value: word, position: tokenStart }
    },
  } satisfies TokenHandlers<OperationTokenType>

  public tokenize(query: string): Token[] {
    this.query = query
    this.current = query[0] ?? ""

    while (!this.isEOF()) {
      this.skipWhitespace()
      if (this.isEOF()) break

      const tokenArray = this.nextToken()
      this.tokens.push(...tokenArray)
    }

    this.tokens.push({ type: "EOF", value: "", position: this.position })
    return this.tokens
  }

  private nextToken(): Token[] {
    const currentWord = this.getCurrentWord()
    // If the word was quoted, we get the word without the quotes or escape sequence backslashes.
    // After handling the word, we need to advance the position by the length of the raw word.

    // once we hit the first PIPE, we switch to the operation token handlers
    if (currentWord.rawWord === operationTokenMap.PIPE) this.isFilter = false
    const handlers: TokenHandlers = this.isFilter ? this.filterTokenHandlers : this.operationTokenHandlers

    for (const handler of Object.values(handlers)) {
      const handlerResult = handler(currentWord, this.position)
      if (!handlerResult) continue

      const tokenArray = Array.isArray(handlerResult) ? handlerResult : [handlerResult]
      if (tokenArray.length > 0) {
        this.advanceBy(currentWord.rawWord.length)
        return tokenArray
      }
    }

    throw new LexerError(`Unexpected character '${this.current}' at position ${this.position}`)
  }

  /**
   * Returns the current word at `this.position`. This does *not* advance the position.
   *
   * More specifically, it returns all characters until whitespace is encountered. In the case of quoted words, it returns all characters until the closing quote is encountered.
   */
  private getCurrentWord(): CurrentWord {
    let word = ""
    let rawWord = ""
    let moveCount = 0
    // because we don't increment the position in this function, we need to separately keep track of the cursor position in the given word and base the logic on that position
    const wordPosition = () => this.position + moveCount

    // In quoted words, the opening quote, closing quote, and escape sequence backslashes are not included in `word`.
    // The `rawWord` represents the whole quoted word as it appears in the query. For unquoted words, `rawWord` will be equal to `word`.
    // Every time we move along the quoted word, we also want to append to `rawWord`.
    const moveCursor = () => {
      rawWord += current()
      moveCount++
    }
    const current = () => this.query[wordPosition()] ?? ""
    const currentIsWhitespace = () => this.isWhitespace(current())
    const isEOF = () => wordPosition() >= this.query.length

    if (current() !== QUOTE_CHAR) {
      while (!(isEOF() || currentIsWhitespace())) {
        word += current()
        moveCursor()
      }

      return { word, rawWord, isQuoted: false }
    }

    // handle quoted words
    moveCursor() // skip opening quote
    while (!isEOF() && current() !== QUOTE_CHAR) {
      if (current() === BACKSLASH_CHAR) {
        // handle escape sequences
        moveCursor() // skip backslash
        if (current() === QUOTE_CHAR) {
          word += current()
          moveCursor()
        } else {
          word += `${BACKSLASH_CHAR}${current()}` // if the backslash wasn't the start of an escape sequence, give it back to the word
          moveCursor()
        }
        continue
      }

      word += current()
      moveCursor()
    }

    if (current() !== QUOTE_CHAR) throw new LexerError(`Unterminated quote at position ${wordPosition()}`)

    // add the closing quote to `rawWord`
    moveCursor()

    return { word, rawWord, isQuoted: true }
  }

  /**
   * FIELD and VALUE words can have operators attached to them.
   *
   * FIELD words can have left attached operators: LPAREN, RPAREN, NOT
   * - e.g. '(field)', '!field', '!(field)', '(!field)'
   * VALUE words can have right attached operators: RPAREN
   * - e.g. '(field == value)'
   */
  private tokenizeAttachedOperators(currentWord: string, tokenStart: number, tokenType: "FIELD" | "VALUE"): Token[] {
    const lparen = filterTokenMap.LPAREN
    const not = filterTokenMap.NOT
    const rparen = filterTokenMap.RPAREN

    let word = currentWord
    let wordStart = tokenStart

    const tokens: Token[] = []

    const handleLeftAttachedOperators = (type: "LPAREN" | "NOT", value: typeof lparen | typeof not) => {
      tokens.push({ type, value, position: wordStart })
      word = word.slice(value.length)
      wordStart += value.length
    }

    if (tokenType === "FIELD") {
      for (const char of word) {
        if (char === lparen) {
          handleLeftAttachedOperators("LPAREN", lparen)
          continue
        }
        if (char === not) {
          handleLeftAttachedOperators("NOT", not)
          continue
        }
        break // if we hit a character that is not a leftAttachedOperator, the rest of the word belongs to the field
      }
    }

    const rightAttachedTokens: Token[] = []

    const handleRightAttachedOperators = (type: "RPAREN", value: typeof rparen) => {
      word = word.slice(0, -value.length)
      rightAttachedTokens.unshift({ type, value, position: wordStart + word.length }) // we handle rightAttachedOperators in reverse, so we unshift instead of push so they're in the right order
    }

    const reversedWord = [...word].reverse().join("")
    for (const char of reversedWord) {
      if (char === rparen) {
        handleRightAttachedOperators("RPAREN", rparen)
        continue
      }
      break // if we hit a character that is not a rightAttachedOperator, the rest of the word belongs to the field/value
    }

    tokens.push({ type: tokenType, value: word, position: wordStart }) // push the word without attached operators
    tokens.push(...rightAttachedTokens)

    return tokens
  }

  private isEOF(): boolean {
    return this.position >= this.query.length
  }

  private skipWhitespace(): void {
    while (!this.isEOF() && this.isWhitespace(this.current)) {
      this.advanceBy(1)
    }
  }

  private isWhitespace(s: string): boolean {
    return WHITESPACE.test(s)
  }

  private get position(): number {
    return this.#position
  }

  private advanceBy(count: number) {
    this.#position += count
    this.current = this.query[this.position] ?? ""
  }

  private isPreviousToken(tokenType: TokenType): boolean {
    const previousToken = this.tokens.at(-1)
    return previousToken?.type === tokenType
  }
}

class LexerError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "LexerError"
  }
}
