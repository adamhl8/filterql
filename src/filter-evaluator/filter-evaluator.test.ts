import { describe, expect, it } from "bun:test"

import { FilterEvaluator } from "~/filter-evaluator/filter-evaluator.ts"
import { parseQuery, testData, testOptions, testSchema } from "~/test-utils.ts"

describe("FilterEvaluator", () => {
  describe("filter", () => {
    it("should filter data based on the query", () => {
      const complexQuery = `
        (t i*= "tion" || t ^= "Inter" || genre ~= "Action") &&
        (y >= 2000 && y <= 2015) &&
        (rating >= 7.0 || genre i== "DRAMA") &&
        (m || !m) &&
        status != "" &&
        !title $= "Missing Title" &&
        (title != "Excluded")
      `
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(complexQuery).filter
      const result = filterEvaluator.filter(testData, node)
      expect(result).toHaveLength(4)
      expect(result.map((r) => r.title)).toEqual([
        "The Matrix Reloaded",
        "Inception",
        "Interstellar",
        "The Dark Knight",
      ])
    })
  })

  const testDataObject = testData[0]

  describe("comparisons", () => {
    it("should return false for a non-matching comparison", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title == "Other Title"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse()
    })

    it("should resolve field aliases", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('t == "The Matrix"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle string fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('genre == "Action"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle number fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year >= 1999").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle boolean fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("monitored").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle match-all", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("*").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle unknown fields when 'allowUnknownFields' is true", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      const node = parseQuery('bar == "some value"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle comparison to undefined", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("undefinedField == undefined").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse()
    })

    it("should handle comparison to null", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("undefinedField == null").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse()
    })

    it("should handle fields that are not in the data", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('foo == "some value"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse()
    })

    it("should handle empty checks for fields that are not in the data", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('foo == ""').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse()
    })

    it("should return false for non-comparable data value type: array", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("title == foo").filter
      const result = filterEvaluator.evaluateFilter(node, { title: ["foo"] })

      expect(result).toBeFalse()
    })

    it("should return false for non-comparable data value type: object", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title == "[object Object]"').filter
      const result = filterEvaluator.evaluateFilter(node, { title: { foo: "bar" } })

      expect(result).toBeFalse()
    })
  })

  describe("comparison operators", () => {
    it("should handle equals operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title == "The Matrix"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle not equals operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title != "Other Title"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle contains operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title *= "Matrix"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle starts with operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title ^= "The"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle ends with operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title $= "Matrix"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle regex operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title ~= ".*Matrix.*"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle case-insensitive operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node1 = parseQuery('title == "the matrix"').filter
      const result1 = filterEvaluator.evaluateFilter(node1, testDataObject)

      expect(result1).toBeFalse()

      const node2 = parseQuery('title i== "the matrix"').filter
      const result2 = filterEvaluator.evaluateFilter(node2, testDataObject)

      expect(result2).toBeTrue()
    })

    it("should handle case-insensitive regex", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title i~= "matrix"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle invalid regex gracefully", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title ~= "[invalid"').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse() // Invalid regex returns no matches
    })

    it("should handle greater than or equal", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("rating >= 8.7").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle less than or equal", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("rating <= 9.0").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })
  })

  describe("logical operators", () => {
    it("should handle operator precedence", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('genre == "Action" || rating >= 8.7').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle complex expressions with parentheses", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('(genre == "Action" || year == 1999) && rating >= 8.7').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle NOT operations", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("!monitored").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeFalse()
    })

    it("should handle NOT with comparisons", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('!(genre == "Drama")').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle AND operations", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('genre == "Action" && monitored').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle OR operations", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year == 1999 || year == 2000").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it("should handle deeply nested expressions", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('monitored && (title i*= "matrix" || rating >= 8.6) && year <= 2010').filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })
  })

  describe("empty checks", () => {
    const dataWithEmpty = { title: "", year: null, monitored: true, rating: 7.5, genre: "Comedy", status: undefined }

    it("should match empty strings", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title == ""').filter
      const result = filterEvaluator.evaluateFilter(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should match undefined values as empty", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('status == ""').filter
      const result = filterEvaluator.evaluateFilter(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should match null values as empty", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('year == ""').filter
      const result = filterEvaluator.evaluateFilter(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should handle not empty comparisons", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('genre != ""').filter
      const result = filterEvaluator.evaluateFilter(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should handle empty string with contains operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title *= ""').filter
      const result = filterEvaluator.evaluateFilter(node, dataWithEmpty)

      expect(result).toBeFalse() // Nothing contains empty string
    })
  })

  describe("error handling", () => {
    it("should throw on duplicate field alias", () => {
      expect(
        () =>
          new FilterEvaluator(
            { title: { type: "string", alias: "t" }, title2: { type: "string", alias: "t" } },
            testOptions,
          ),
      ).toThrowErrorWithNameAndMessage("FilterQLError", "Duplicate field alias 't' in schema")
    })

    it("should throw on unknown field", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('bar == "some value"').filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Unknown field 'bar'",
      )
    })

    it("should throw on invalid value for a number field", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year == hello").filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'hello' for field 'year' (number)",
      )
    })

    it("should throw when a numeric operator is not used with a number", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year <= hello").filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'hello' for field 'year': the '<=' operator must be used with a number",
      )
    })

    it("should throw on an invalid value for a boolean field", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("monitored == hello").filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'hello' for field 'monitored' (boolean)",
      )
    })
  })
})
