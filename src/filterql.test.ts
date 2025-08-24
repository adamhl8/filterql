import { describe, expect, it } from "bun:test"

import { FilterQL } from "~/filterql.js"
import type { OperationMap } from "~/operation-evaluator/types.js"
import { testData, testSchema } from "~/test-utils.js"

describe("FilterQL", () => {
  describe("filter", () => {
    it("should return the data as-is when the query is empty", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const result = filterql.filter(testData, "")

      expect(result).toBe(testData) // using toBe instead of toEqual because the object reference should be the same
    })
  })

  describe("usage", () => {
    it("should filter and sort movies", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const result = filterql.filter(testData, "rating >= 8.5 | SORT year desc")

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
      const result = filterql.filter(testData, "* | SORT rating desc | LIMIT 3")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toEqual(["The Dark Knight", "Inception", "The Matrix"])
    })

    it("should handle custom operation", () => {
      const customOperations: OperationMap = {
        DOUBLE: (data) => [...data, ...data],
      }

      const filterql = new FilterQL({ schema: testSchema, customOperations })
      const result = filterql.filter(testData, "t == Inception | DOUBLE")

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.title === "Inception")).toBeTrue()
    })
  })
})
