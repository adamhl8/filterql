import { describe, expect, it } from "bun:test"

import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode } from "~/parser/types.js"

describe("parser", () => {
  it("should parse comparison", () => {
    const input = "title == matrix"
    const parser = new Parser(new Lexer(input).tokenize())

    const expected: ASTNode = {
      type: "comparison",
      field: "title",
      operator: "==",
      value: "matrix",
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  it("should parse field shorthand", () => {
    const input = "available"
    const parser = new Parser(new Lexer(input).tokenize())

    const expected: ASTNode = {
      type: "comparison",
      field: "available",
      operator: "==",
      value: "true",
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  it("should parse complex expression", () => {
    const input = '!available && (title i*= "matrix" || !available) && year >= 2000'
    const parser = new Parser(new Lexer(input).tokenize())

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
          },
        },
        right: {
          type: "or",
          left: {
            type: "comparison",
            field: "title",
            operator: "i*=",
            value: "matrix",
          },
          right: {
            type: "not",
            operand: {
              type: "comparison",
              field: "available",
              operator: "==",
              value: "true",
            },
          },
        },
      },
      right: {
        type: "comparison",
        field: "year",
        operator: ">=",
        value: "2000",
      },
    }

    const result = parser.parse()
    expect(result).toEqual(expected)
  })

  describe("logical operations", () => {
    it("should parse parentheses", () => {
      const input = "(title == matrix)"
      const parser = new Parser(new Lexer(input).tokenize())

      const expected: ASTNode = {
        type: "comparison",
        field: "title",
        operator: "==",
        value: "matrix",
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should parse NOT expression", () => {
      const input = "!available"
      const parser = new Parser(new Lexer(input).tokenize())

      const expected: ASTNode = {
        type: "not",
        operand: {
          type: "comparison",
          field: "available",
          operator: "==",
          value: "true",
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should parse AND expression", () => {
      const input = "title == matrix && other != test"
      const parser = new Parser(new Lexer(input).tokenize())

      const expected: ASTNode = {
        type: "and",
        left: {
          type: "comparison",
          field: "title",
          operator: "==",
          value: "matrix",
        },
        right: {
          type: "comparison",
          field: "other",
          operator: "!=",
          value: "test",
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should parse OR expression", () => {
      const input = "title == matrix || other != test"
      const parser = new Parser(new Lexer(input).tokenize())

      const expected: ASTNode = {
        type: "or",
        left: {
          type: "comparison",
          field: "title",
          operator: "==",
          value: "matrix",
        },
        right: {
          type: "comparison",
          field: "other",
          operator: "!=",
          value: "test",
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })

    it("should handle operator precedence", () => {
      const input = "title == matrix || other == test && year == 2000"
      const parser = new Parser(new Lexer(input).tokenize())

      const expected: ASTNode = {
        type: "or",
        left: {
          type: "comparison",
          field: "title",
          operator: "==",
          value: "matrix",
        },
        right: {
          type: "and",
          left: {
            type: "comparison",
            field: "other",
            operator: "==",
            value: "test",
          },
          right: {
            type: "comparison",
            field: "year",
            operator: "==",
            value: "2000",
          },
        },
      }

      const result = parser.parse()
      expect(result).toEqual(expected)
    })
  })

  describe("error handling", () => {
    it("should throw on unexpected token after complete expression", () => {
      const input = "title == matrix extra"
      const parser = new Parser(new Lexer(input).tokenize())
      expect(() => parser.parse()).toThrowErrorWithNameAndMessage(
        "ParserError",
        "Unexpected token 'extra' at position 16",
      )
    })

    it("should throw on missing closing parenthesis", () => {
      const input = "(title == matrix"
      const parser = new Parser(new Lexer(input).tokenize())
      expect(() => parser.parse()).toThrowErrorWithNameAndMessage(
        "ParserError",
        "Expected ')' but found '' at position 16",
      )
    })

    it("should throw on missing field name", () => {
      const input = "== matrix"
      const parser = new Parser(new Lexer(input).tokenize())
      expect(() => parser.parse()).toThrowErrorWithNameAndMessage(
        "ParserError",
        "Expected field name but found '==' at position 0",
      )
    })

    it("should throw on invalid operator", () => {
      const input = "title %% matrix"
      const parser = new Parser(new Lexer(input).tokenize())
      expect(() => parser.parse()).toThrowErrorWithNameAndMessage("ParserError", "Unexpected token '%%' at position 6")
    })

    it("should throw on missing value after operator", () => {
      const input = "title =="
      const parser = new Parser(new Lexer(input).tokenize())
      expect(() => parser.parse()).toThrowErrorWithNameAndMessage(
        "ParserError",
        "Expected value but found '' at position 8",
      )
    })

    it("should throw on invalid token after operator", () => {
      const input = "title == &&"
      const parser = new Parser(new Lexer(input).tokenize())
      expect(() => parser.parse()).toThrowErrorWithNameAndMessage(
        "ParserError",
        "Expected value but found '&&' at position 9",
      )
    })
  })
})
