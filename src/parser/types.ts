import { comparisonOperators } from "~/lexer/types.js"

export type BaseComparisonOperator = (typeof comparisonOperators)[number]
/** case-insensitive comparison operators */
type IComparisonOperator = `i${BaseComparisonOperator}`
export type ComparisonOperator = BaseComparisonOperator | IComparisonOperator

const allComparisonOperators = [...comparisonOperators, ...comparisonOperators.map((op) => `i${op}`)]
export const isComparisonOperator = (value: string): value is ComparisonOperator =>
  allComparisonOperators.includes(value)

export interface ComparisonNode {
  type: "comparison"
  field: string
  operator: ComparisonOperator
  value: string
}

export interface NotOpNode {
  type: "not"
  operand: ASTNode
}

export interface LogicalOpNode {
  type: "and" | "or"
  left: ASTNode
  right: ASTNode
}

export type ASTNode = ComparisonNode | NotOpNode | LogicalOpNode
