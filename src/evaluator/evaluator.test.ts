import { describe, expect, it } from "bun:test"

import { Evaluator } from "~/evaluator/evaluator.js"
import type { EvaluatorOptions, Schema } from "~/evaluator/types.js"
import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode } from "~/parser/types.js"

function parseQuery(query: string): ASTNode {
  const lexer = new Lexer(query)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens)
  return parser.parse()
}

const testSchema: Schema = {
  title: { type: "string", alias: "t" },
  year: { type: "number", alias: "y" },
  monitored: { type: "boolean", alias: "m" },
  rating: { type: "number" },
  genre: { type: "string" },
  status: { type: "string" },
}

const testOptions: EvaluatorOptions = {
  ignoreUnknownFields: false,
}

const testData = { title: "The Matrix", year: 1999, monitored: true, rating: 8.7, genre: "Action", status: "Available" }

describe("evaluator", () => {
  it("should return false for a non-matching comparison", () => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery('title == "Other Title"')
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeFalse()
  })

  it("should resolve field aliases", () => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery('t == "The Matrix"')
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeTrue()
  })

  it("should handle string fields", () => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery('genre == "Action"')
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeTrue()
  })

  it("should handle number fields", () => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery("year >= 1999")
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeTrue()
  })

  it("should handle boolean fields", () => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery("monitored")
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeTrue()
  })

  it.each(["true", "1", "yes", "y"])("should convert valid 'true' values for boolean fields ('%s')", (trueValue) => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery(`monitored == ${trueValue}`)
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeTrue()
  })

  it.each(["false", "0", "no", "n"])("should convert valid 'false' values for boolean fields ('%s')", (falseValue) => {
    const evaluator = new Evaluator(testSchema, testOptions)
    const node = parseQuery(`monitored == ${falseValue}`)
    const result = evaluator.evaluate(node, testData)

    expect(result).toBeFalse()
  })

  describe("comparison operators", () => {
    it("should handle equals operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title == "The Matrix"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle not equals operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title != "Other Title"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle contains operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title *= "Matrix"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle starts with operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title ^= "The"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle ends with operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title $= "Matrix"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle regex operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title ~= ".*Matrix.*"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle case-insensitive operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node1 = parseQuery('title == "the matrix"')
      const result1 = evaluator.evaluate(node1, testData)

      expect(result1).toBeFalse()

      const node2 = parseQuery('title i== "the matrix"')
      const result2 = evaluator.evaluate(node2, testData)

      expect(result2).toBeTrue()
    })

    it("should handle case-insensitive regex", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title i~= "matrix"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle invalid regex gracefully", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title ~= "[invalid"')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeFalse() // Invalid regex returns no matches
    })

    it("should handle greater than or equal", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("rating >= 8.7")
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle less than or equal", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("rating <= 9.0")
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })
  })

  describe("logical operators", () => {
    it("should handle operator precedence", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('genre == "Action" || rating >= 8.7')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle complex expressions with parentheses", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('(genre == "Action" || year == 1999) && rating >= 8.7')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle NOT operations", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("!monitored")
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeFalse()
    })

    it("should handle NOT with comparisons", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('!(genre == "Drama")')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle AND operations", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('genre == "Action" && monitored')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle OR operations", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("year == 1999 || year == 2000")
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })

    it("should handle deeply nested expressions", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('monitored && (title i*= "matrix" || rating >= 8.6) && year <= 2010')
      const result = evaluator.evaluate(node, testData)

      expect(result).toBeTrue()
    })
  })

  describe("empty checks", () => {
    const dataWithEmpty = { title: "", year: null, monitored: true, rating: 7.5, genre: "Comedy", status: undefined }

    it("should match empty strings", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title == ""')
      const result = evaluator.evaluate(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should match undefined values as empty", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('status == ""')
      const result = evaluator.evaluate(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should match null values as empty", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('year == ""')
      const result = evaluator.evaluate(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should handle not empty comparisons", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('genre != ""')
      const result = evaluator.evaluate(node, dataWithEmpty)

      expect(result).toBeTrue()
    })

    it("should handle empty string with contains operator", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('title *= ""')
      const result = evaluator.evaluate(node, dataWithEmpty)

      expect(result).toBeFalse() // Nothing contains empty string
    })
  })

  describe("error handling", () => {
    it("should throw on duplicate field alias", () => {
      expect(
        () =>
          new Evaluator({ title: { type: "string", alias: "t" }, title2: { type: "string", alias: "t" } }, testOptions),
      ).toThrowErrorWithNameAndMessage("Error", "Duplicate field alias 't' in schema")
    })

    it("should throw on unknown field", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery('unknown == "the matrix"')
      expect(() => evaluator.evaluate(node, testData)).toThrowErrorWithNameAndMessage(
        "EvaluationError",
        "Unknown field 'unknown'",
      )
    })

    it("should not throw on unknown field when 'ignoreUnknownFields' is true", () => {
      const evaluator = new Evaluator(testSchema, { ignoreUnknownFields: true })
      const node = parseQuery('unknown == "the matrix"')
      expect(() => evaluator.evaluate(node, testData)).not.toThrow()
    })

    it("should throw on an invalid value for a number field", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("year <= hello")
      expect(() => evaluator.evaluate(node, testData)).toThrowErrorWithNameAndMessage(
        "EvaluationError",
        "Invalid value 'hello' for field 'year' (number)",
      )
    })

    it("should throw when a numeric operator is not used with a number", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("title <= hello")
      expect(() => evaluator.evaluate(node, testData)).toThrowErrorWithNameAndMessage(
        "EvaluationError",
        "Invalid value 'hello' for field 'title': the '<=' operator must be used with a number",
      )
    })

    it("should throw on an invalid value for a boolean field", () => {
      const evaluator = new Evaluator(testSchema, testOptions)
      const node = parseQuery("monitored == hello")
      expect(() => evaluator.evaluate(node, testData)).toThrowErrorWithNameAndMessage(
        "EvaluationError",
        "Invalid value 'hello' for field 'monitored' (boolean)",
      )
    })
  })
})
