import { describe, expect, it } from "bun:test"

import { Lexer } from "~/lexer/lexer.js"
import type { Token } from "~/lexer/types.js"
import { comparisonOperators } from "~/lexer/types.js"

const createEofToken = (input: string): Token => ({
  type: "EOF",
  value: "",
  position: input.length,
})

describe("lexer", () => {
  it("should handle value", () => {
    const input = "field == value"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "VALUE", value: "value", position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle quoted value", () => {
    const input = 'field == "value"'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "QUOTED_VALUE", value: "value", position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle empty quoted value", () => {
    const input = 'field == ""'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "QUOTED_VALUE", value: "", position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle input with varying spaces", () => {
    const input = 'field=="value"&& other  !=   test'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 5 },
      { type: "QUOTED_VALUE", value: "value", position: 7 },
      { type: "AND", value: "&&", position: 14 },
      { type: "FIELD", value: "other", position: 17 },
      { type: "COMPARISON_OPERATOR", value: "!=", position: 24 },
      { type: "VALUE", value: "test", position: 29 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle whitespace in input", () => {
    const input = " field == value "
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 1 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 7 },
      { type: "VALUE", value: "value", position: 10 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle quoted value with escape sequences", () => {
    const input = 'field == "value \\"quoted\\" \\slash \\\\doubleslash"' // 'field == "value \"quoted\" \slash \\doubleslash"'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "QUOTED_VALUE", value: 'value "quoted" \\slash \\\\doubleslash', position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle reserved characters in quoted value", () => {
    const input = 'field == "$value&"'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "QUOTED_VALUE", value: "$value&", position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle all comparison operators", () => {
    const input = comparisonOperators.map((op) => `field ${op} value`).join(" && ")
    const lexer = new Lexer(input)
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
    const expected: Token[] = [...expectedTokens, createEofToken(input)]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle all case-insensitive comparison operators", () => {
    const input = comparisonOperators.map((op) => `field i${op} value`).join(" && ")
    const lexer = new Lexer(input)
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
    const expected: Token[] = [...expectedTokens, createEofToken(input)]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle case-insensitive comparison", () => {
    const input = "i i== value"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "i", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "i==", position: 2 },
      { type: "VALUE", value: "value", position: 6 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle field that ends with 'i'", () => {
    const input = "i == value"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "FIELD", value: "i", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 2 },
      { type: "VALUE", value: "value", position: 5 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle parentheses", () => {
    const input = "( )"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "LPAREN", value: "(", position: 0 },
      { type: "RPAREN", value: ")", position: 2 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle logical operators", () => {
    const input = "! && ||"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "NOT", value: "!", position: 0 },
      { type: "AND", value: "&&", position: 2 },
      { type: "OR", value: "||", position: 5 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should distinguish ! from field and !=", () => {
    const input = "!field != value"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "NOT", value: "!", position: 0 },
      { type: "FIELD", value: "field", position: 1 },
      { type: "COMPARISON_OPERATOR", value: "!=", position: 7 },
      { type: "VALUE", value: "value", position: 10 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should throw on unterminated string", () => {
    const input = 'field == "unterminated'
    const lexer = new Lexer(input)
    expect(() => lexer.tokenize()).toThrowErrorWithNameAndMessage("LexerError", "Unterminated string at position 22")
  })

  it("should throw when ambiguous case-insensitive operator is at the start of the query", () => {
    const input = "i==value"
    const lexer = new Lexer(input)
    expect(() => lexer.tokenize()).toThrowErrorWithNameAndMessage(
      "LexerError",
      "Ambiguous syntax 'i==' at position 0: field is missing or you meant 'i =='",
    )
  })

  it("should throw when case-insensitive operator is not preceded by whitespace", () => {
    const input = "fieldi==value"
    const lexer = new Lexer(input)
    expect(() => lexer.tokenize()).toThrowErrorWithNameAndMessage(
      "LexerError",
      "Ambiguous syntax 'i==' at position 5: case-insensitive operators must be preceded by whitespace",
    )
  })
})
