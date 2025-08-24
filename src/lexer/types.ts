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
 * A map of filter token types to their corresponding characters/strings.
 */
export const filterTokenMap = {
  LPAREN: "(",
  RPAREN: ")",
  NOT: "!",
  AND: "&&",
  OR: "||",
  VALUE: undefined,
  COMPARISON_OPERATOR: comparisonOperators,
  MATCH_ALL: "*",
  FIELD: undefined,
} as const
export type FilterTokenType = keyof typeof filterTokenMap

/**
 * Because operations must come at the end of a query, operations can effectively be treated as independent grammar.
 *
 * In other words, once we encounter an operation, the lexer no longer has to worry about any other token types.
 */
export const operationTokenMap = {
  PIPE: "|",
  OPERATION_NAME: undefined,
  OPERATION_ARGUMENT: undefined,
} as const
export type OperationTokenType = keyof typeof operationTokenMap

const tokenMap = {
  ...filterTokenMap,
  ...operationTokenMap,
  EOF: undefined, // end of input
}

export type TokenType = keyof typeof tokenMap
export interface Token {
  type: TokenType
  value: string
  position: number
}
