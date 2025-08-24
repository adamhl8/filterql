import { comparisonOperators } from "~/lexer/types.js"

export type BaseComparisonOperator = (typeof comparisonOperators)[number]
/** case-insensitive comparison operators */
type IComparisonOperator = `i${BaseComparisonOperator}`
type ComparisonOperator = BaseComparisonOperator | IComparisonOperator

const allComparisonOperators = [...comparisonOperators, ...comparisonOperators.map((op) => `i${op}`)]
export const isComparisonOperator = (value: string): value is ComparisonOperator =>
  allComparisonOperators.includes(value)

export type ASTNode = QueryNode

interface QueryNode {
  type: "query"
  filter: FilterNode
  operations: OperationNode[]
}

export interface FilterNode {
  type: "filter"
  expression: ExpressionNode
}

export type ExpressionNode = ComparisonNode | NotOpNode | LogicalOpNode | MatchAllNode

export interface ComparisonNode {
  type: "comparison"
  field: string
  operator: ComparisonOperator
  value: string
}

export interface NotOpNode {
  type: "not"
  operand: ExpressionNode
}

export interface LogicalOpNode {
  type: "and" | "or"
  left: ExpressionNode
  right: ExpressionNode
}

export interface OperationNode {
  type: "operation"
  name: string
  args: string[]
}

interface MatchAllNode {
  type: "match_all"
}
