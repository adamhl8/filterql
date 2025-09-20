import { describe, expect, it } from "bun:test"

import { Lexer } from "~/lexer/lexer.ts"
import type { Token } from "~/lexer/types.ts"
import { comparisonOperators } from "~/lexer/types.ts"

const createEofToken = (query: string): Token => ({
  type: "EOF",
  value: "",
  position: query.length,
})

describe("Lexer", () => {
  describe("comparisons", () => {
    it("should handle field", () => {
      const query = "field"

      const expected: Token[] = [{ type: "FIELD", value: "field", position: 0 }, createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle syntax in fields/values", () => {
      const query = "foo|f(i)e!l&&d||"

      const expected: Token[] = [{ type: "FIELD", value: "foo|f(i)e!l&&d||", position: 0 }, createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle comparison without whitespace", () => {
      const query = "field==value"

      const expected: Token[] = [{ type: "FIELD", value: "field==value", position: 0 }, createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle field and comparison operator", () => {
      const query = "field =="

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle comparison operator and value", () => {
      const query = "== value"

      const expected: Token[] = [
        { type: "COMPARISON_OPERATOR", value: "==", position: 0 },
        { type: "VALUE", value: "value", position: 3 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle comparison", () => {
      const query = "field == value"

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "value", position: 9 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle multiple comparisons", () => {
      const query = "field == value && field == value"

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "value", position: 9 },
        { type: "AND", value: "&&", position: 15 },
        { type: "FIELD", value: "field", position: 18 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 24 },
        { type: "VALUE", value: "value", position: 27 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle case-insensitive comparison", () => {
      const query = "field i== value"

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "i==", position: 6 },
        { type: "VALUE", value: "value", position: 10 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle quoted value", () => {
      const query = 'field == "value"'

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "value", position: 9 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle quoted words", () => {
      const query = '"field" "==" "value"'

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 8 },
        { type: "VALUE", value: "value", position: 13 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle empty quoted value", () => {
      const query = 'field == ""'

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "", position: 9 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle quoted value with escape sequences", () => {
      const query = 'field == "value \\"quoted\\" \\slash \\\\doubleslash"' // 'field == "value \"quoted\" \slash \\doubleslash"'

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: 'value "quoted" \\slash \\\\doubleslash', position: 9 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle extra whitespace", () => {
      const query = ' field  ==   "value"    '

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 1 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 8 },
        { type: "VALUE", value: "value", position: 13 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle empty query", () => {
      const query = ""

      const expected: Token[] = [createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle whitespace-only query", () => {
      const query = "  "

      const expected: Token[] = [createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle all comparison operators", () => {
      const query = comparisonOperators.map((op) => `field ${op} value`).join(" && ")

      const expectedTokens: Token[] = comparisonOperators
        .flatMap((op, index) => [
          {
            type: "FIELD",
            value: "field",
            position: index * 18,
          },
          {
            type: "COMPARISON_OPERATOR",
            value: op,
            position: index * 18 + 6,
          },
          {
            type: "VALUE",
            value: "value",
            position: index * 18 + 9,
          },
          {
            type: "AND",
            value: "&&",
            position: index * 18 + 15,
          },
        ])
        .slice(0, -1) as Token[] // get rid of the last AND token
      const expected: Token[] = [...expectedTokens, createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle all case-insensitive comparison operators", () => {
      const query = comparisonOperators.map((op) => `field i${op} value`).join(" && ")

      const expectedTokens: Token[] = comparisonOperators
        .flatMap((op, index) => [
          {
            type: "FIELD",
            value: "field",
            position: index * 19,
          },
          {
            type: "COMPARISON_OPERATOR",
            value: `i${op}`,
            position: index * 19 + 6,
          },
          {
            type: "VALUE",
            value: "value",
            position: index * 19 + 10,
          },
          {
            type: "AND",
            value: "&&",
            position: index * 19 + 16,
          },
        ])
        .slice(0, -1) as Token[] // get rid of the last AND token
      const expected: Token[] = [...expectedTokens, createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })
  })

  describe("logical operators", () => {
    it("should handle parentheses", () => {
      const query = "( )"

      const expected: Token[] = [
        { type: "LPAREN", value: "(", position: 0 },
        { type: "RPAREN", value: ")", position: 2 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle logical operators", () => {
      const query = "! && ||"

      const expected: Token[] = [
        { type: "NOT", value: "!", position: 0 },
        { type: "AND", value: "&&", position: 2 },
        { type: "OR", value: "||", position: 5 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })
  })

  describe("match-all", () => {
    it("should handle match-all", () => {
      const query = "*"

      const expected: Token[] = [{ type: "MATCH_ALL", value: "*", position: 0 }, createEofToken(query)]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle match-all with comparisons", () => {
      const query = "field == value && *"

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "value", position: 9 },
        { type: "AND", value: "&&", position: 15 },
        { type: "MATCH_ALL", value: "*", position: 18 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should only tokenize as MATCH_ALL when used in field position", () => {
      const query = "field == *"

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "*", position: 9 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })
  })

  describe("attached operators", () => {
    it("should handle parentheses attached to fields", () => {
      const query = "(field)"

      const expected: Token[] = [
        { type: "LPAREN", value: "(", position: 0 },
        { type: "FIELD", value: "field", position: 1 },
        { type: "RPAREN", value: ")", position: 6 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle NOT attached to fields", () => {
      const query = "!field"

      const expected: Token[] = [
        { type: "NOT", value: "!", position: 0 },
        { type: "FIELD", value: "field", position: 1 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle NOT and LPAREN attached to field", () => {
      const query = "!(field)"

      const expected: Token[] = [
        { type: "NOT", value: "!", position: 0 },
        { type: "LPAREN", value: "(", position: 1 },
        { type: "FIELD", value: "field", position: 2 },
        { type: "RPAREN", value: ")", position: 7 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle LPAREN and NOT attached to field", () => {
      const query = "(!field)"

      const expected: Token[] = [
        { type: "LPAREN", value: "(", position: 0 },
        { type: "NOT", value: "!", position: 1 },
        { type: "FIELD", value: "field", position: 2 },
        { type: "RPAREN", value: ")", position: 7 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle RPAREN attached to values", () => {
      const query = "(field == value)"

      const expected: Token[] = [
        { type: "LPAREN", value: "(", position: 0 },
        { type: "FIELD", value: "field", position: 1 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 7 },
        { type: "VALUE", value: "value", position: 10 },
        { type: "RPAREN", value: ")", position: 15 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle operators that are part of the word", () => {
      const query = "(f(ie)ld == v)al(ue)"

      const expected: Token[] = [
        { type: "LPAREN", value: "(", position: 0 },
        { type: "FIELD", value: "f(ie)ld", position: 1 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 9 },
        { type: "VALUE", value: "v)al(ue", position: 12 },
        { type: "RPAREN", value: ")", position: 19 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle operators as part of quoted value", () => {
      const query = 'field == "(value)"'

      const expected: Token[] = [
        { type: "FIELD", value: "field", position: 0 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
        { type: "VALUE", value: "(value)", position: 9 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle nested attached operators", () => {
      const query = "(!(!field1 == value1) && field2 == value2))"

      const expected: Token[] = [
        { type: "LPAREN", value: "(", position: 0 },
        { type: "NOT", value: "!", position: 1 },
        { type: "LPAREN", value: "(", position: 2 },
        { type: "NOT", value: "!", position: 3 },
        { type: "FIELD", value: "field1", position: 4 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 11 },
        { type: "VALUE", value: "value1", position: 14 },
        { type: "RPAREN", value: ")", position: 20 },
        { type: "AND", value: "&&", position: 22 },
        { type: "FIELD", value: "field2", position: 25 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 32 },
        { type: "VALUE", value: "value2", position: 35 },
        { type: "RPAREN", value: ")", position: 41 },
        { type: "RPAREN", value: ")", position: 42 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })
  })

  describe("operations", () => {
    const baseQuery = "field == value"
    const baseExpected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "VALUE", value: "value", position: 9 },
    ]

    it("should handle operation", () => {
      const query = `${baseQuery} | operation_name arg1 arg2`

      const expected: Token[] = [
        ...baseExpected,
        { type: "PIPE", value: "|", position: 15 },
        { type: "OPERATION_NAME", value: "operation_name", position: 17 },
        { type: "OPERATION_ARGUMENT", value: "arg1", position: 32 },
        { type: "OPERATION_ARGUMENT", value: "arg2", position: 37 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle multiple operations", () => {
      const query = `${baseQuery} | operation_name arg1 | another_operation arg1 arg2`

      const expected: Token[] = [
        ...baseExpected,
        { type: "PIPE", value: "|", position: 15 },
        { type: "OPERATION_NAME", value: "operation_name", position: 17 },
        { type: "OPERATION_ARGUMENT", value: "arg1", position: 32 },
        { type: "PIPE", value: "|", position: 37 },
        { type: "OPERATION_NAME", value: "another_operation", position: 39 },
        { type: "OPERATION_ARGUMENT", value: "arg1", position: 57 },
        { type: "OPERATION_ARGUMENT", value: "arg2", position: 62 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle empty operations", () => {
      const query = `${baseQuery} | |`

      const expected: Token[] = [
        ...baseExpected,
        { type: "PIPE", value: "|", position: 15 },
        { type: "PIPE", value: "|", position: 17 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle operation after empty operation", () => {
      const query = `${baseQuery} | | operation_name arg1`

      const expected: Token[] = [
        ...baseExpected,
        { type: "PIPE", value: "|", position: 15 },
        { type: "PIPE", value: "|", position: 17 },
        { type: "OPERATION_NAME", value: "operation_name", position: 19 },
        { type: "OPERATION_ARGUMENT", value: "arg1", position: 34 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle operation when query has '||' operator", () => {
      const query = `${baseQuery} || field == value | operation_name arg1 arg2`

      const expected: Token[] = [
        ...baseExpected,
        { type: "OR", value: "||", position: 15 },
        { type: "FIELD", value: "field", position: 18 },
        { type: "COMPARISON_OPERATOR", value: "==", position: 24 },
        { type: "VALUE", value: "value", position: 27 },
        { type: "PIPE", value: "|", position: 33 },
        { type: "OPERATION_NAME", value: "operation_name", position: 35 },
        { type: "OPERATION_ARGUMENT", value: "arg1", position: 50 },
        { type: "OPERATION_ARGUMENT", value: "arg2", position: 55 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })

    it("should handle everything after the first PIPE as operations", () => {
      const query = `${baseQuery} | field == value`

      const expected: Token[] = [
        ...baseExpected,
        { type: "PIPE", value: "|", position: 15 },
        { type: "OPERATION_NAME", value: "field", position: 17 },
        { type: "OPERATION_ARGUMENT", value: "==", position: 23 },
        { type: "OPERATION_ARGUMENT", value: "value", position: 26 },
        createEofToken(query),
      ]

      const tokens = new Lexer().tokenize(query)
      expect(tokens).toEqual(expected)
    })
  })

  describe("error handling", () => {
    it("should throw on unterminated string", () => {
      const query = 'field == "unterminated'

      expect(() => new Lexer().tokenize(query)).toThrowErrorWithNameAndMessage(
        "LexerError",
        "Unterminated quote at position 22",
      )
    })

    it("should throw on unexpected character", () => {
      const query = 'field ""'

      expect(() => new Lexer().tokenize(query)).toThrowErrorWithNameAndMessage(
        "LexerError",
        "Unexpected character '\"' at position 6",
      )
    })
  })
})
