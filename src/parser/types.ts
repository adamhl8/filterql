import type { numericOperators } from "~/lexer/types.js"
import { stringOperators } from "~/lexer/types.js"

/*
 * Any field can be checked for an empty value
 * For example, a query can check if the `title` field is empty: `title == ""`
 *
 * A empty check is valid for any field type.
 * For example, say there's a field called "year" with type "number". A query like `year == hello` is invalid and will throw an error.
 * But a query like `year == ""` *is* valid and will check if the `year` field in the data is empty.
 */
export type FieldType = "string" | "number" | "boolean"

export interface FieldConfig {
  type: FieldType
  alias?: string
}

export type Schema = Record<string, FieldConfig>

interface BaseComparisonNode {
  type: "comparison"
  field: string
}

// All values can be coerced to strings, hence why we don't have a separate BooleanComparisonNode
// Numeric comparisons can obviously only be done with numbers, so we need a separate NumericComparisonNode

type StringComparisonOperator = (typeof stringOperators)[number]
export const isStringComparisonOperator = (operator: string): operator is StringComparisonOperator =>
  stringOperators.includes(operator as StringComparisonOperator)

export interface StringComparisonNode extends BaseComparisonNode {
  operator: StringComparisonOperator
  value: string
  isCaseInsensitive: boolean
}
export const isStringComparisonNode = (node: ComparisonNode): node is StringComparisonNode =>
  isStringComparisonOperator(node.operator)

export type NumericComparisonOperator = (typeof numericOperators)[number]
export interface NumericComparisonNode extends BaseComparisonNode {
  operator: NumericComparisonOperator
  value: number
}

export type ComparisonOperator = StringComparisonOperator | NumericComparisonOperator
export type ComparisonNode = StringComparisonNode | NumericComparisonNode

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
