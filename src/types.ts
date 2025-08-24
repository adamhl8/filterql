type FieldType = "string" | "number" | "boolean"

interface FieldConfig {
  type: FieldType
  alias?: string
}

export type Schema = Record<string, FieldConfig>

export interface FilterQLOptions {
  allowUnknownFields?: boolean
}
export type RequiredFilterQLOptions = Required<FilterQLOptions>

export type DataObject = Record<string | number | symbol, unknown>

export class FilterQLError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "FilterQLError"
  }
}
