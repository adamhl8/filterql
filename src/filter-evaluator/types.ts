import type { BaseComparisonOperator } from "~/parser/types.js"

export interface Comparison {
  field: string
  operator: BaseComparisonOperator
  value: string
  isCaseInsensitive: boolean
}

export const isComparableDataValue = (value: unknown): value is string | number | boolean | undefined | null =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === undefined ||
  value === null
