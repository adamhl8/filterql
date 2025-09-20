import type { RequiredFilterQLOptions, Schema } from "~/types.ts"
import { FilterQLError } from "~/types.ts"

export abstract class BaseEvaluator {
  public readonly schema: Schema
  public readonly options: RequiredFilterQLOptions

  private readonly aliasToFieldMap: Record<string, string> = {}

  public constructor(schema: Schema, options: RequiredFilterQLOptions) {
    this.schema = schema
    this.options = options

    for (const [field, { alias }] of Object.entries(schema)) {
      if (!alias) continue
      if (this.aliasToFieldMap[alias]) throw new FilterQLError(`Duplicate field alias '${alias}' in schema`)
      this.aliasToFieldMap[alias] = field
    }
  }

  /**
   * Resolves the field name from the given field or alias
   *
   * Returns `undefined` if the field or alias is not resolved
   */
  public resolveField(fieldOrAlias: string): string | undefined {
    // if the field exists in the schema, we know it's not an alias
    if (this.schema[fieldOrAlias]) return fieldOrAlias
    return this.aliasToFieldMap[fieldOrAlias]
  }
}
