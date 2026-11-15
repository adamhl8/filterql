import { describe, expect, it } from "bun:test"

import { parseQuery, testData, testOptions, testSchema } from "#__tests__/test-utils.ts"
import { FilterEvaluator } from "#filter-evaluator/filter-evaluator.ts"

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
      expect(result.map((r) => r.title)).toStrictEqual([
        "The Matrix Reloaded",
        "Inception",
        "Interstellar",
        "The Dark Knight",
      ])
    })
  })

  const [testDataObject] = testData

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

    it.each([
      ["title == 10", { title: 10 }],
      ["title == true", { title: true }],
      ["title i== TRUE", { title: true }],
      ["title ^= 1", { title: 10 }],
    ])("should match %s against %o as text", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeTrue()
    })

    it.each([
      ["title != 10", { title: 10 }],
      ["title == 10.0", { title: 10 }],
      ["title == TRUE", { title: true }],
    ])("should not match %s against %o as text", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeFalse()
    })

    it("should handle number fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year >= 1999").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it.each([
      ["rating == 9.0", { rating: 9 }],
      ["rating == 8.50", { rating: 8.5 }],
      ["year == 2003", { year: "2003" }],
      ["year >= 2000", { year: "2003" }],
      ["year <= 2003.0", { year: 2003 }],
    ])("should match %s numerically against %o", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeTrue()
    })

    it.each([
      ["rating != 9.0", { rating: 9 }],
      ["rating == 1", { rating: true }],
      ["rating >= 1", { rating: true }],
      ["rating <= 0", { rating: " " }],
      ["rating >= 16", { rating: "0x10" }],
      ["rating >= 0", { rating: Number.NaN }],
      ["rating == 9", { rating: "abc" }],
      ["rating != 9", { rating: "abc" }],
    ])("should not match %s against %o", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeFalse()
    })

    it("should compare range operators numerically on string fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      expect(filterEvaluator.evaluateFilter(parseQuery("title >= 5").filter, { title: "10" })).toBeTrue()
      expect(filterEvaluator.evaluateFilter(parseQuery("title <= 5").filter, { title: "10" })).toBeFalse()
    })

    it.each([
      ["title >= M", { title: "Matrix" }],
      ["title <= M", { title: "Inception" }],
      ["title i>= m", { title: "Matrix" }],
      ["status >= 2024-01-01", { status: "2024-06-01" }],
      ["status <= 2024-01-01", { status: "2023-12-31" }],
      ["title >= 5", { title: 10 }],
    ])("should match %s against %o on a string field", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeTrue()
    })

    it.each([
      ["title >= M", { title: "Inception" }],
      ["title >= m", { title: "Matrix" }],
      ["title >= 5", { title: "abc" }],
      ["status >= 2024", { status: "2024-06-01" }],
    ])("should not match %s against %o on a string field", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeFalse()
    })

    it("should not throw when a range operator on an unknown field isn't used with a number", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      expect(filterEvaluator.evaluateFilter(parseQuery("bar >= abc").filter, { bar: "xyz" })).toBeTrue()
    })

    it.each([
      ["bar == 5.0", { bar: 5 }],
      ["bar == TRUE", { bar: true }],
      ["bar != false", { bar: true }],
      ["bar == x", { bar: "x" }],
      ["bar >= 5", { bar: "10" }],
      ["bar >= M", { bar: "Matrix" }],
      ["bar ^= 19", { bar: 1999 }],
      ["!(bar == abc)", { bar: 5 }],
    ])("should match %s against %o on an unknown field", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeTrue()
    })

    it.each([
      ["bar == abc", { bar: 5 }],
      ["bar != abc", { bar: 5 }],
      ["bar <= abc", { bar: 10 }],
      ["bar >= 5", { bar: "abc" }],
      ["bar == yes", { bar: true }],
      ["bar >= abc", { bar: true }],
      ["bar *= tr", { bar: true }],
    ])("should not match %s against %o on an unknown field", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeFalse()
    })

    it("should compare range operators numerically on unknown fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      expect(filterEvaluator.evaluateFilter(parseQuery("bar >= 5").filter, { bar: 10 })).toBeTrue()
    })

    it("should match a negated equality when the data can't be converted to a number", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("!(rating == 9)").filter
      expect(filterEvaluator.evaluateFilter(node, { rating: "abc" })).toBeTrue()
    })

    it.each(["9.0", ".5", "1e3", "-1.5"])("should accept decimal number value %s", (value) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(`rating >= ${value}`).filter

      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).not.toThrow()
    })

    it("should handle boolean fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("monitored").filter
      const result = filterEvaluator.evaluateFilter(node, testDataObject)

      expect(result).toBeTrue()
    })

    it.each([
      ["m == TRUE", { monitored: true }],
      ["m == True", { monitored: true }],
      ["m != TRUE", { monitored: false }],
      ["m == false", { monitored: false }],
      ["m", { monitored: "TRUE" }],
      ["m == false", { monitored: "False" }],
      ["!m", { monitored: 1 }],
      ["!m", { monitored: "yes" }],
    ])("should match %s against %o as a boolean", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeTrue()
    })

    it.each([
      ["m != TRUE", { monitored: true }],
      ["m", { monitored: 1 }],
      ["m != true", { monitored: 1 }],
      ["m", { monitored: "yes" }],
      ["m != true", { monitored: "yes" }],
    ])("should not match %s against %o as a boolean", (query, dataObject) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(query).filter
      expect(filterEvaluator.evaluateFilter(node, dataObject)).toBeFalse()
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

    it.each(["year ^= 199", "year *= 99", "year $= 999", "year ~= ^199", String.raw`year i~= ^199\d$`])(
      "should match %s against a number field's text",
      (query) => {
        const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
        const node = parseQuery(query).filter
        expect(filterEvaluator.evaluateFilter(node, testDataObject)).toBeTrue()
      },
    )

    it("should not throw when a pattern operator's value on a number field isn't a number", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year *= abc").filter
      expect(filterEvaluator.evaluateFilter(node, testDataObject)).toBeFalse()
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
    const dataWithEmpty = {
      genre: "Comedy",
      monitored: true,
      rating: 7.5,
      status: undefined,
      title: "",
      // oxlint-disable-next-line unicorn/no-null - `null` is one of the empty values under test
      year: null,
    }

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

    it("should handle not empty comparisons on number fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('rating != ""').filter
      const result = filterEvaluator.evaluateFilter(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should handle empty checks on boolean fields", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)

      expect(filterEvaluator.evaluateFilter(parseQuery('monitored == ""').filter, dataWithEmpty)).toBeFalse()
      expect(filterEvaluator.evaluateFilter(parseQuery('monitored != ""').filter, dataWithEmpty)).toBeTrue()
    })
  })

  describe("error handling", () => {
    it("should throw on duplicate field alias", () => {
      expect(
        () =>
          new FilterEvaluator(
            { title: { alias: "t", type: "string" }, title2: { alias: "t", type: "string" } },
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

    it("should reject unknown fields in an empty check", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('bar == ""').filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Unknown field 'bar'",
      )
    })

    it.each([
      ["title", "*="],
      ["title", ">="],
      ["rating", "<="],
      ["year", "i^="],
    ])("should throw when %s %s is used with an empty value", (field, operator) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(`${field} ${operator} ""`).filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        `The '${operator}' operator can't be used with an empty check (field '${field}'). Empty checks must use '==' or '!='.`,
      )
    })

    it("should report an unknown field before an empty check error", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('bar *= ""').filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Unknown field 'bar'",
      )
    })

    it("should throw when an unknown field is used with an empty value and a non-empty-check operator", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      const node = parseQuery('bar $= ""').filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "The '$=' operator can't be used with an empty check (field 'bar'). Empty checks must use '==' or '!='.",
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

    it.each(['" "', "0x10", "Infinity"])("should throw on non-decimal number value %s", (value) => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery(`rating == ${value}`).filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        `Invalid value '${value.replaceAll('"', "")}' for field 'rating' (number)`,
      )
    })

    it("should throw when a range operator on a number field isn't used with a number", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("year <= hello").filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'hello' for field 'year' (number)",
      )
    })

    it.each([">=", "<=", "i>=", "*=", "^=", "$=", "~="])(
      "should throw when %s is used on a boolean field",
      (operator) => {
        const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
        const node = parseQuery(`m ${operator} true`).filter
        expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
          "FilterEvaluatorError",
          `The '${operator}' operator can't be used on boolean field 'monitored'`,
        )
      },
    )

    it("should throw on an invalid value for a boolean field", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery("monitored == hello").filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid value 'hello' for field 'monitored' (boolean)",
      )
    })

    it("should throw on an invalid regex", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, testOptions)
      const node = parseQuery('title ~= "[invalid"').filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid regex '[invalid' for field 'title'",
      )
    })

    it("should throw on an invalid regex for an unknown field", () => {
      const filterEvaluator = new FilterEvaluator(testSchema, { allowUnknownFields: true })
      const node = parseQuery('bar i~= "(a"').filter
      expect(() => filterEvaluator.evaluateFilter(node, testDataObject)).toThrowErrorWithNameAndMessage(
        "FilterEvaluatorError",
        "Invalid regex '(a' for field 'bar'",
      )
    })
  })
})
