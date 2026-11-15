import { describe, expect, it } from "bun:test"

import { testData, testSchema } from "#__tests__/test-utils.ts"
import { FilterQL } from "#filterql.ts"
import type { OperationMap } from "#operation-evaluator/types.ts"
import type { ComparisonNode, FilterNode } from "#parser/parser.ts"

describe("FilterQL", () => {
  describe("usage", () => {
    it("should filter and sort movies", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const result = filterql.query(testData, "rating >= 8.5 | SORT year desc")

      expect(result).toHaveLength(4)
      expect(result.map((r) => ({ title: r.title, year: r.year, rating: r.rating }))).toStrictEqual([
        { title: "Interstellar", year: 2014, rating: 8.6 },
        { title: "Inception", year: 2010, rating: 8.8 },
        { title: "The Dark Knight", year: 2008, rating: 9 },
        { title: "The Matrix", year: 1999, rating: 8.7 },
      ])
    })

    it("should handle match-all syntax with operations", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const result = filterql.query(testData, "* | SORT rating desc | LIMIT 3")

      expect(result).toHaveLength(3)
      expect(result.map((r) => r.title)).toStrictEqual(["The Dark Knight", "Inception", "The Matrix"])
    })

    it("should handle custom operation", () => {
      const customOperations: OperationMap = {
        DOUBLE: (data) => [...data, ...data],
      }

      const filterql = new FilterQL({ schema: testSchema, customOperations })
      const result = filterql.query(testData, "t == Inception | DOUBLE")

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.title === "Inception")).toBe(true)
    })
  })

  describe("validation", () => {
    it("should throw from parse() on an invalid value", () => {
      const filterql = new FilterQL({ schema: testSchema })
      expect(() => filterql.parse("rating == abc")).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'abc' for field 'rating' (number)",
      )
    })

    it("should throw from parse() on an invalid regex", () => {
      const filterql = new FilterQL({ schema: testSchema })
      expect(() => filterql.parse('title ~= "(a"')).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid regex '(a' for field 'title'",
      )
    })

    it("should throw from query() on an invalid value with empty data", () => {
      const filterql = new FilterQL({ schema: testSchema })
      expect(() => filterql.query([], "rating == abc")).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'abc' for field 'rating' (number)",
      )
    })

    it("should throw from applyFilter() on an invalid hand-built filter with empty data", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const filter: FilterNode = {
        type: "filter",
        expression: { type: "comparison", field: "rating", operator: "==", value: "abc" },
      }
      expect(() => filterql.applyFilter([], filter)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'abc' for field 'rating' (number)",
      )
    })

    it("should validate comparisons nested in not, and, and or", () => {
      const filterql = new FilterQL({ schema: testSchema })
      expect(() => filterql.parse("!(t == Inception || (m && y == abc))")).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'abc' for field 'year' (number)",
      )
    })

    it("should throw from applyFilter() after a hand-built filter is changed", () => {
      const filterql = new FilterQL({ schema: testSchema })
      const comparison: ComparisonNode = { type: "comparison", field: "rating", operator: "==", value: "9" }
      const filter: FilterNode = { type: "filter", expression: comparison }
      filterql.applyFilter(testData, filter)

      comparison.value = "abc"

      expect(() => filterql.applyFilter(testData, filter)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'abc' for field 'rating' (number)",
      )
    })
  })

  describe("reuse", () => {
    it("should return the same results when one instance runs several queries", () => {
      const queries = [
        "year >= 2008",
        "year >= 2008",
        "genre == Action",
        "genre i== action",
        "* | SORT year desc",
        "title == Inception",
        "m",
      ]
      const filterql = new FilterQL({ schema: testSchema })

      const results = queries.map((query) => filterql.query(testData, query))

      expect(results).toStrictEqual(queries.map((query) => new FilterQL({ schema: testSchema }).query(testData, query)))
    })
  })
})
