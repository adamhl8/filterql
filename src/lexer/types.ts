export const stringOperators = [
  "==", // equals
  "!=", // not equals
  "*=", // contains
  "^=", // starts with
  "$=", // ends with
  "~=", // regex
] as const

export const numericOperators = [
  ">=", // greater than or equal to
  "<=", // less than or equal to
] as const

export const comparisonOperators = [...stringOperators, ...numericOperators] as const

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

export const comparisonOperatorCharacters = comparisonOperators.map((op) => op[0] ?? "").filter(Boolean)

/**
 * An array of the first character of each token. Used as part of the list of forbidden characters during lexing.
 */
export const tokenCharacters = Object.values(tokenTypeMap)
  .flat()
  .map((char) => char[0] ?? "")
  .filter(Boolean)

type TokenType = keyof typeof tokenTypeMap

export interface Token {
  type: TokenType
  value: string
  position: number
}
