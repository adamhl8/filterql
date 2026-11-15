import type { BaseComparisonOperator } from "#parser/parser.ts"
import type { FieldType } from "#types.ts"

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

/** Operators grouped by what they do, which decides how they validate and match. */
export type OperatorGroup = "equality" | "range" | "pattern"

export const operatorGroups: Record<BaseComparisonOperator, OperatorGroup> = {
  "==": "equality",
  "!=": "equality",
  ">=": "range",
  "<=": "range",
  "*=": "pattern",
  "^=": "pattern",
  "$=": "pattern",
  "~=": "pattern",
}

export const groupFieldTypes: Record<OperatorGroup, readonly FieldType[]> = {
  equality: ["string", "number", "boolean"],
  range: ["string", "number"],
  pattern: ["string", "number"],
}

export const isComparableDataValue = (value: unknown): value is string | number | boolean | undefined | null =>
  typeof value === "string"
  || typeof value === "number"
  || typeof value === "boolean"
  || value === undefined
  || value === null
