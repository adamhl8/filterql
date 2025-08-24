import type { BaseComparisonOperator } from "~/parser/types.js"

export interface Comparison {
  field: string
  operator: BaseComparisonOperator
  value: string
  isCaseInsensitive: boolean
}
