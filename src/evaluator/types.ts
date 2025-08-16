import type { BaseComparisonOperator } from "~/parser/types.js"

export type FieldType = "string" | "number" | "boolean"

export interface FieldConfig {
  type: FieldType
  alias?: string
}

export type Schema = Record<string, FieldConfig>

export interface Comparison {
  field: string
  operator: BaseComparisonOperator
  value: string
  isCaseInsensitive: boolean
}

export interface EvaluatorOptions {
  allowUnknownFields: boolean
}

export type Data = Record<string | number | symbol, unknown>
