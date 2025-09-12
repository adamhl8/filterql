import type { DataObject, FilterQLOptions, Schema } from "~/types.js"

interface OperationHelpers {
  /** The schema of the FilterQL instance */
  schema: Schema
  /** The options of the FilterQL instance */
  options: FilterQLOptions
  /** Resolves the field name from the given string by checking if it's a valid field or alias of the schema */
  resolveField: (fieldOrAlias: string) => string | undefined
}

export type OperationFn = <T extends DataObject>(data: T[], args: string[], helpers: OperationHelpers) => T[]
export type OperationMap = Record<string, OperationFn>
