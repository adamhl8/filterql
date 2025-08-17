import { LexerError } from "~/lexer/lexer.js"

export const comparisonOperators = [
  "==", // equals
  "!=", // not equals
  "*=", // contains
  "^=", // starts with
  "$=", // ends with
  "~=", // regex
  ">=", // greater than or equal to
  "<=", // less than or equal to
] as const

/**
 * A map of token types to their corresponding characters/strings.
 */
export const tokenTypeMap = {
  FIELD: undefined,
  COMPARISON_OPERATOR: comparisonOperators,
  VALUE: undefined,
  QUOTED_VALUE: '"',
  LPAREN: "(",
  RPAREN: ")",
  NOT: "!",
  AND: "&&",
  OR: "||",
  EOF: undefined, // end of input
} as const

const tokens = Object.values(tokenTypeMap)
  .flat()
  .filter((token) => token !== undefined)

/**
 * An array of tokens that terminate a FIELD or VALUE
 */
const terminators = [" ", "\t", "\n", "\r", ...tokens] as const
type Terminator = (typeof terminators)[number]

export const isTerminator = (token: string): token is Terminator => {
  // when we reach the end of the input, the passed in token has a length of 1, so we pad it with a space
  const paddedToken = token.padEnd(2)

  const firstChar = paddedToken[0]
  // terminators are always 1 or 2 characters long, this should never throw unless we make a mistake when calling it
  if (!(firstChar && paddedToken.length === 2))
    throw new LexerError(`INTERNAL ERROR: provided token ${token} string is not of length 2`)
  return terminators.includes(firstChar as Terminator) || terminators.includes(paddedToken as Terminator)
}

type TokenType = keyof typeof tokenTypeMap

export interface Token {
  type: TokenType
  value: string
  position: number
}
