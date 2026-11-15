import type { OperatorGroup } from "#filter-evaluator/types.ts"
import { FilterEvaluatorError, groupFieldTypes } from "#filter-evaluator/types.ts"
import type { FieldType } from "#types.ts"

/** Parses a finite decimal number, or returns `undefined`. */
const parseNumber = (value: string): number | undefined => {
  const parsedNumber = Number(value)
  // oxlint-disable-next-line unicorn/prefer-number-coercion - `parseFloat()` rejects `""`, whitespace, and hex, binary, or octal literals, which `Number()` accepts
  return Number.isFinite(parsedNumber) && parsedNumber === Number.parseFloat(value) ? parsedNumber : undefined
}

/** Converts a data value to a finite number, or returns `undefined` if it can't. */
export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") return parseNumber(value)
  return undefined
}

/** Parses `true` or `false` in any case, or returns `undefined`. */
const parseBoolean = (value: string): boolean | undefined => {
  const lower = value.toLowerCase()
  if (lower === "true") return true
  if (lower === "false") return false
  return undefined
}

/** Converts a data value to a boolean, or returns `undefined` if it can't. */
export const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return parseBoolean(value)
  return undefined
}

/** Converts a query value to the field type, or returns `undefined` if it can't. */
const convertToFieldType = (value: string, type: FieldType): string | number | boolean | undefined => {
  if (type === "number") return parseNumber(value)
  if (type === "boolean") return parseBoolean(value)
  return value
}

/**
 * Converts a comparison value for the field type and operator group, or returns `undefined` if it can't.
 *
 * Known fields use the schema type, and unknown fields use the data value's type.
 */
export const convertComparisonValue = (
  value: string,
  type: FieldType,
  group: OperatorGroup,
): string | number | boolean | undefined => {
  const allowedFieldTypes = groupFieldTypes[group]
  if (!allowedFieldTypes.includes(type)) return undefined
  // Pattern operators match the value's text.
  if (group === "pattern") return value
  // Range operators on strings compare numerically when the query value is a number, and alphabetically otherwise.
  if (group === "range" && type === "string") return parseNumber(value) ?? value

  return convertToFieldType(value, type)
}

/** Returns the field type that matches a data value's type. */
export const fieldTypeOf = (dataValue: string | number | boolean): FieldType => {
  if (typeof dataValue === "number") return "number"
  if (typeof dataValue === "boolean") return "boolean"
  return "string"
}

export const isEmpty = (val: unknown) => val === "" || val === undefined || val === null

/** Compiles a `~=` pattern, and throws if it isn't a valid regex. */
export const compileRegex = (pattern: string, isCaseInsensitive: boolean, field: string): RegExp => {
  try {
    return new RegExp(pattern, isCaseInsensitive ? "i" : "")
  } catch {
    throw new FilterEvaluatorError(`Invalid regex '${pattern}' for field '${field}'`)
  }
}
