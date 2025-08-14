import { describe, expect, it } from "bun:test"

import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode, Schema } from "~/parser/types.js"

const testSchema: Schema = {
  title: { type: "string", alias: "t" },
  available: { type: "boolean", alias: "m" },
  year: { type: "number", alias: "y" },
  other: { type: "string" },
}

describe("parser", () => {
  it("should parse simple comparison", () => {
    const input = "title == matrix"
    const parser = new Parser(new Lexer(input).tokenize(), testSchema)

    const expected: ASTNode = {
      type: "comparison",
      field: "title",
      operator: "==",
      value: "matrix",
      isCaseInsensitive: false,
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  it("should resolve field aliases", () => {
    const input = "t == matrix"
    const parser = new Parser(new Lexer(input).tokenize(), testSchema)

    const expected: ASTNode = {
      type: "comparison",
      field: "title", // alias "t" resolved to "title"
      operator: "==",
      value: "matrix",
      isCaseInsensitive: false,
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  it("should parse boolean field shorthand", () => {
    const input = "available"
    const parser = new Parser(new Lexer(input).tokenize(), testSchema)

    const expected: ASTNode = {
      type: "comparison",
      field: "available",
      operator: "==",
      value: "true",
      isCaseInsensitive: false,
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  it("should parse parentheses", () => {
    const input = "(title == matrix)"
    const parser = new Parser(new Lexer(input).tokenize(), testSchema)

    const expected: ASTNode = {
      type: "comparison",
      field: "title",
      operator: "==",
      value: "matrix",
      isCaseInsensitive: false,
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  it("should parse complex expression", () => {
    const input = '!available && (title i*= "matrix" || !available) && year >= 2000'
    const parser = new Parser(new Lexer(input).tokenize(), testSchema)

    const expected: ASTNode = {
      type: "and",
      left: {
        type: "and",
        left: {
          type: "not",
          operand: {
            type: "comparison",
            field: "available",
            operator: "==",
            value: "true",
            isCaseInsensitive: false,
          },
        },
        right: {
          type: "or",
          left: {
            type: "comparison",
            field: "title",
            operator: "*=",
            value: "matrix",
            isCaseInsensitive: true,
          },
          right: {
            type: "not",
            operand: {
              type: "comparison",
              field: "available",
              operator: "==",
              value: "true",
              isCaseInsensitive: false,
            },
          },
        },
      },
      right: {
        type: "comparison",
        field: "year",
        operator: ">=",
        value: 2000,
      },
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  describe("logical operations", () => {
    it("should parse AND expression", () => {
      const input = "title == matrix && other != test"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "and",
        left: {
          type: "comparison",
          field: "title",
          operator: "==",
          value: "matrix",
          isCaseInsensitive: false,
        },
        right: {
          type: "comparison",
          field: "other",
          operator: "!=",
          value: "test",
          isCaseInsensitive: false,
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should parse OR expression", () => {
      const input = "title == matrix || other != test"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "or",
        left: {
          type: "comparison",
          field: "title",
          operator: "==",
          value: "matrix",
          isCaseInsensitive: false,
        },
        right: {
          type: "comparison",
          field: "other",
          operator: "!=",
          value: "test",
          isCaseInsensitive: false,
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should parse NOT expression", () => {
      const input = "!available"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "not",
        operand: {
          type: "comparison",
          field: "available",
          operator: "==",
          value: "true",
          isCaseInsensitive: false,
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should handle operator precedence", () => {
      const input = "title == matrix || other == test && year == 2000"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "or",
        left: {
          type: "comparison",
          field: "title",
          operator: "==",
          value: "matrix",
          isCaseInsensitive: false,
        },
        right: {
          type: "and",
          left: {
            type: "comparison",
            field: "other",
            operator: "==",
            value: "test",
            isCaseInsensitive: false,
          },
          right: {
            type: "comparison",
            field: "year",
            operator: "==",
            value: "2000",
            isCaseInsensitive: false,
          },
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })
  })

  describe("comparison resolution", () => {
    it("should parse case-insensitive operator", () => {
      const input = "title i== matrix"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "comparison",
        field: "title",
        operator: "==",
        value: "matrix",
        isCaseInsensitive: true,
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should parse comparison using numeric operator as a NumericComparisonNode", () => {
      const input = "year >= 2000"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "comparison",
        field: "year",
        operator: ">=",
        value: 2000,
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should allow empty checks for all field types", () => {
      const input = 'title == "" && available == "" && year == ""'
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      const expected: ASTNode = {
        type: "and",
        left: {
          type: "and",
          left: {
            type: "comparison",
            field: "title",
            operator: "==",
            value: "",
            isCaseInsensitive: false,
          },
          right: {
            type: "comparison",
            field: "available",
            operator: "==",
            value: "",
            isCaseInsensitive: false,
          },
        },
        right: {
          type: "comparison",
          field: "year",
          operator: "==",
          value: "",
          isCaseInsensitive: false,
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it.each(["true", "1", "yes", "y"])(
      "should convert valid 'true' values for boolean field types ('%s')",
      (trueValue) => {
        const input = `available == ${trueValue}`
        const parser = new Parser(new Lexer(input).tokenize(), testSchema)

        const expected: ASTNode = {
          type: "comparison",
          field: "available",
          operator: "==",
          value: "true",
          isCaseInsensitive: false,
        }

        const result = parser.parse()
        expect(result).toEqual(expected)
      },
    )

    it.each(["false", "0", "no", "n"])(
      "should convert valid 'false' values for boolean field types ('%s')",
      (falseValue) => {
        const input = `available == ${falseValue}`
        const parser = new Parser(new Lexer(input).tokenize(), testSchema)

        const expected: ASTNode = {
          type: "comparison",
          field: "available",
          operator: "==",
          value: "false",
          isCaseInsensitive: false,
        }

        const result = parser.parse()
        expect(result).toEqual(expected)
      },
    )
  })

  describe("error handling", () => {
    it("should throw on unexpected token after complete expression", () => {
      const input = "title == matrix extra"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Unexpected token 'extra' at position 16")
    })

    it("should throw on missing closing parenthesis", () => {
      const input = "(title == matrix"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Expected ')' but found '' at position 16")
    })

    it("should throw on missing field name", () => {
      const input = "== matrix"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Expected field name but found '==' at position 0")
    })

    it("should throw on missing value after operator", () => {
      const input = "title =="
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Expected value but found '' at position 8")
    })

    it("should throw on invalid token after operator", () => {
      const input = "title == &&"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Expected value but found '&&' at position 9")
    })

    it("should throw on unknown field", () => {
      const input = "unknown == matrix"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Unknown field 'unknown' at position 0")
    })

    it("should throw when a numeric operator is not used with a number", () => {
      const input = "year <= hello"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow(
        "Invalid value 'hello' for field 'year' at position 0: the '<=' operator must be used with a number",
      )
    })

    it("should throw on invalid number", () => {
      const input = "year == hello"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Invalid number 'hello' for field 'year' at position 0")
    })

    it("should throw on invalid boolean", () => {
      const input = "available == maybe"
      const parser = new Parser(new Lexer(input).tokenize(), testSchema)

      expect(() => parser.parse()).toThrow("Invalid boolean 'maybe' for field 'available' at position 0")
    })
  })
})
