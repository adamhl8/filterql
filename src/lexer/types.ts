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

export const comparisonOperatorCharacters = comparisonOperators.map((op) => op[0] ?? "").filter(Boolean)

/**
 * A map of token types to their corresponding reserved characters/strings.
 */
export const tokenTypeMap = {
  IDENTIFIER: "", // field names
  COMPARISON_OPERATOR: comparisonOperators,
  QUOTED_VALUE: '"', // quoted values (non-quoted values are lexed as identifiers and handled by the parser)
  LPAREN: "(",
  RPAREN: ")",
  NOT: "!",
  AND: "&&",
  OR: "||",
  EOF: "", // end of input
} as const

const tokenCharacters = Object.values(tokenTypeMap)
  .flat()
  .map((char) => char[0] ?? "")
  .filter(Boolean)

/**
 * An array of reserved characters. An IDENTIFIER can not contain any of these characters.
 */
export const reservedCharacters = [" ", "\t", "\n", "\r", "\\", ...tokenCharacters]

type TokenType = keyof typeof tokenTypeMap

export interface Token {
  type: TokenType
  value: string
  position: number
}
