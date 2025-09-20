import type { OperationMap } from "~/operation-evaluator/types.ts"

export const defaultOperations: OperationMap = {
  LIMIT: (data, args) => {
    const limit = args[0]
    const limitNumber = Number(limit)
    if (Number.isNaN(limitNumber)) throw new Error(`Invalid number argument '${limit}' for operation 'LIMIT'`)
    if (limitNumber < 0) throw new Error(`Number argument '${limit}' for operation 'LIMIT' cannot be negative`)
    return data.slice(0, limitNumber)
  },
  SORT: (data, args, { options, resolveField }) => {
    const [field = "", direction = "asc"] = args

    let resolvedField = resolveField(field)
    if (options.allowUnknownFields && !resolvedField) resolvedField = field
    if (!resolvedField) throw new Error(`Unknown field '${field}' for operation 'SORT'`)

    if (direction !== "asc" && direction !== "desc")
      throw new Error(
        `Invalid direction argument '${direction}' for operation 'SORT': should be either 'asc' or 'desc'`,
      )

    const collator = new Intl.Collator(undefined, { ignorePunctuation: true, sensitivity: "base", numeric: true })
    const sortedData = data.toSorted((a, b) => {
      const aValue = a[resolvedField] ?? ""
      const bValue = b[resolvedField] ?? ""
      const aString = typeof aValue === "string" ? aValue : aValue.toString()
      const bString = typeof bValue === "string" ? bValue : bValue.toString()
      if (direction === "desc") return collator.compare(bString, aString)
      return collator.compare(aString, bString)
    })

    return sortedData
  },
}
