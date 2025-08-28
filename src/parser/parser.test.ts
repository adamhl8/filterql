import { describe, expect, it } from "bun:test"

import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode } from "~/parser/types.js"

describe("parser", () => {
  describe("queries", () => {
    it("should parse comparison", () => {
      const query = "title == matrix"

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "comparison",
            field: "title",
            operator: "==",
            value: "matrix",
          },
        },
        operations: [],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })

    it("should parse empty query as match-all filter", () => {
      const query = ""

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "match_all",
          },
        },
        operations: [],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })

    it("should parse field shorthand", () => {
      const query = "available"

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "comparison",
            field: "available",
            operator: "==",
            value: "true",
          },
        },
        operations: [],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })

    it("should parse complex expression", () => {
      const query = '!available && (title i*= "matrix" || !available) && year >= 2000'

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
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
          },
        },
        operations: [],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })

    describe("logical operations", () => {
      it("should parse parentheses", () => {
        const query = "(title == matrix)"

        const expected: ASTNode = {
          type: "query",
          filter: {
            type: "filter",
            expression: {
              type: "comparison",
              field: "title",
              operator: "==",
              value: "matrix",
            },
          },
          operations: [],
        }

        const result = new Parser().parse(new Lexer().tokenize(query))
        expect(result).toEqual(expected)
      })

      it("should parse NOT expression", () => {
        const query = "!available"

        const expected: ASTNode = {
          type: "query",
          filter: {
            type: "filter",
            expression: {
              type: "not",
              operand: {
                type: "comparison",
                field: "available",
                operator: "==",
                value: "true",
              },
            },
          },
          operations: [],
        }

        const result = new Parser().parse(new Lexer().tokenize(query))
        expect(result).toEqual(expected)
      })

      it("should parse AND expression", () => {
        const query = "title == matrix && other != test"

        const expected: ASTNode = {
          type: "query",
          filter: {
            type: "filter",
            expression: {
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
            },
          },
          operations: [],
        }

        const result = new Parser().parse(new Lexer().tokenize(query))
        expect(result).toEqual(expected)
      })

      it("should parse OR expression", () => {
        const query = "title == matrix || other != test"

        const expected: ASTNode = {
          type: "query",
          filter: {
            type: "filter",
            expression: {
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
            },
          },
          operations: [],
        }

        const result = new Parser().parse(new Lexer().tokenize(query))
        expect(result).toEqual(expected)
      })

      it("should handle operator precedence", () => {
        const query = "title == matrix || other == test && year == 2000"

        const expected: ASTNode = {
          type: "query",
          filter: {
            type: "filter",
            expression: {
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
            },
          },
          operations: [],
        }

        const result = new Parser().parse(new Lexer().tokenize(query))
        expect(result).toEqual(expected)
      })
    })

    it("should parse match-all", () => {
      const query = "*"

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "match_all",
          },
        },
        operations: [],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })
  })

  describe("operations", () => {
    it("should parse single operation", () => {
      const query = "title == matrix | sort year desc"

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "comparison",
            field: "title",
            operator: "==",
            value: "matrix",
          },
        },
        operations: [
          {
            type: "operation",
            name: "sort",
            args: ["year", "desc"],
          },
        ],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })

    it("should parse multiple operations", () => {
      const query = "title == matrix | sort year desc | limit 10"

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "comparison",
            field: "title",
            operator: "==",
            value: "matrix",
          },
        },
        operations: [
          {
            type: "operation",
            name: "sort",
            args: ["year", "desc"],
          },
          {
            type: "operation",
            name: "limit",
            args: ["10"],
          },
        ],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })

    it("should parse operation with no arguments", () => {
      const query = "title == matrix | sort"

      const expected: ASTNode = {
        type: "query",
        filter: {
          type: "filter",
          expression: {
            type: "comparison",
            field: "title",
            operator: "==",
            value: "matrix",
          },
        },
        operations: [
          {
            type: "operation",
            name: "sort",
            args: [],
          },
        ],
      }

      const result = new Parser().parse(new Lexer().tokenize(query))
      expect(result).toEqual(expected)
    })
  })

  describe("error handling", () => {
    describe("filter errors", () => {
      it("should throw on unexpected token after complete expression", () => {
        const query = "title == matrix extra"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Unexpected token 'extra' at position 16",
        )
      })

      it("should throw on missing field name", () => {
        const query = "== matrix"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected field name but found '==' at position 0",
        )
      })

      it("should throw on missing comparison operator", () => {
        // this is technically equivalent to the first test in this describe block, since 'title' expands to 'title == true'
        const query = "title matrix"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Unexpected token 'matrix' at position 6",
        )
      })

      it("should throw on missing value after operator", () => {
        const query = "title =="

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected value but found '' at position 8",
        )
      })

      it("should throw on invalid field name", () => {
        const query = "&& == matrix"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected field name but found '&&' at position 0",
        )
      })

      it("should throw on invalid comparison operator", () => {
        const query = "title ! matrix"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Unexpected token '!' at position 6",
        )
      })

      it("should throw on invalid value", () => {
        const query = "title == &&"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected value but found '&&' at position 9",
        )
      })

      it("should throw on missing closing parenthesis", () => {
        const query = "(title == matrix"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected ')' but found '' at position 16",
        )
      })
    })

    describe("operation errors", () => {
      it("should throw on empty operation", () => {
        const query = "title == matrix |"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected operation name but found '' at position 17",
        )
      })

      it("should throw on empty operation followed by valid operation", () => {
        const query = "title == matrix | | SORT year"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected operation name but found '|' at position 18",
        )
      })

      it("should throw on operation without filter", () => {
        const query = "| SORT year"

        expect(() => new Parser().parse(new Lexer().tokenize(query))).toThrowErrorWithNameAndMessage(
          "ParserError",
          "Expected field name but found '|' at position 0",
        )
      })
    })
  })
})
