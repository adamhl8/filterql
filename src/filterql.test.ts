import { describe, expect, it } from "bun:test"

import { FilterQL } from "~/filterql.ts"
import type { OperationMap } from "~/operation-evaluator/types.ts"
import { testData, testSchema } from "~/test-utils.ts"

describe("FilterQL", () => {
  describe("usage", () => {
    it("should filter and sort movies", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const result = filterql.query(testData, "rating >= 8.5 | SORT year desc")

      expect(result).toHaveLength(4)
      expect(result.map((r) => ({ title: r.title, year: r.year, rating: r.rating }))).toEqual([
        { title: "Interstellar", year: 2014, rating: 8.6 },
        { title: "Inception", year: 2010, rating: 8.8 },
        { title: "The Dark Knight", year: 2008, rating: 9.0 },
        { title: "The Matrix", year: 1999, rating: 8.7 },
      ])
    })

    it("should handle match-all syntax with operations", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const result = filterql.query(testData, "* | SORT rating desc | LIMIT 3")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Dark Knight", "Inception", "The Matrix"])
    })

    it("should handle custom operation", () => {
      const customOperations: OperationMap = {
        DOUBLE: (data) => [...data, ...data],
      }

      const filterql = new FilterQL({ schema: testSchema, customOperations })
      const result = filterql.query(testData, "t == Inception | DOUBLE")

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.title === "Inception")).toBeTrue()
    })
  })
})
