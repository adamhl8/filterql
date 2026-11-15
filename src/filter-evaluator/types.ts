import type { BaseComparisonOperator } from "#parser/parser.ts"

interface BaseComparison {
  field: string
  value: string
  isCaseInsensitive: boolean
}

interface RegexComparison extends BaseComparison {
  operator: "~="
  regex: RegExp
}

interface NonRegexComparison extends BaseComparison {
  operator: Exclude<BaseComparisonOperator, "~=">
}

export type Comparison = RegexComparison | NonRegexComparison

export const isComparableDataValue = (value: unknown): value is string | number | boolean | undefined | null =>
  typeof value === "string"
  || typeof value === "number"
  || typeof value === "boolean"
  || value === undefined
  || value === null
