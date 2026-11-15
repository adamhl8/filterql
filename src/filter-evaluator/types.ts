import type { BaseComparisonOperator } from "#parser/parser.ts"
import type { FieldType } from "#types.ts"

export class FilterEvaluatorError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "FilterEvaluatorError"
  }
}

interface BaseComparison {
  field: string
  operator: BaseComparisonOperator
  /** Whether to lowercase the data value before comparing. */
  isCaseInsensitive: boolean
  /** The `~=` pattern, compiled once instead of once per row. Only `~=` comparisons have one. */
  regex: RegExp | undefined
}

interface KnownFieldComparison extends BaseComparison {
  isUnknownField: false
  /** The query value, converted to the field type and lowercased for case-insensitive comparisons. */
  value: string | number | boolean
}

interface UnknownFieldComparison extends BaseComparison {
  isUnknownField: true
  /** The query value, lowercased for case-insensitive comparisons. It converts to the data value's type on each row. */
  value: string
}

export type Comparison = KnownFieldComparison | UnknownFieldComparison

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
