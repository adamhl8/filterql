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
  it("should handle unquoted value", () => {
    const input = "field == value"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "IDENTIFIER", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "IDENTIFIER", value: "value", position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle quoted value", () => {
    const input = 'field == "value"'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "IDENTIFIER", value: "field", position: 0 },
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
      { type: "IDENTIFIER", value: "field", position: 0 },
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
      { type: "IDENTIFIER", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 5 },
      { type: "QUOTED_VALUE", value: "value", position: 7 },
      { type: "AND", value: "&&", position: 14 },
      { type: "IDENTIFIER", value: "other", position: 17 },
      { type: "COMPARISON_OPERATOR", value: "!=", position: 24 },
      { type: "IDENTIFIER", value: "test", position: 29 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle quoted value with escape sequences", () => {
    const input = 'field == "value \\"quoted\\" \\slash \\\\doubleslash"' // 'field == "value \"quoted\" \slash \\doubleslash"'
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "IDENTIFIER", value: "field", position: 0 },
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
      { type: "IDENTIFIER", value: "field", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "==", position: 6 },
      { type: "QUOTED_VALUE", value: "$value&", position: 9 },
      createEofToken(input),
    ]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle all comparison operators", () => {
    const input = comparisonOperators.join(" ")
    const lexer = new Lexer(input)
    const expectedTokens: Token[] = comparisonOperators.map((op) => ({
      type: "COMPARISON_OPERATOR",
      value: op,
      position: input.indexOf(op),
    }))
    const expected: Token[] = [...expectedTokens, createEofToken(input)]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should handle all case-insensitive comparison operators", () => {
    const input = comparisonOperators.map((op) => `i${op}`).join(" ")
    const lexer = new Lexer(input)
    const expectedTokens: Token[] = comparisonOperators.map((op) => ({
      type: "COMPARISON_OPERATOR",
      value: `i${op}`,
      position: input.indexOf(`i${op}`),
    }))
    const expected: Token[] = [...expectedTokens, createEofToken(input)]

    const tokens = lexer.tokenize()
    expect(tokens).toEqual(expected)
  })

  it("should not include 'i' in identifier when followed by a comparison operator", () => {
    const input = "idi i== value"
    const lexer = new Lexer(input)
    const expected: Token[] = [
      { type: "IDENTIFIER", value: "idi", position: 0 },
      { type: "COMPARISON_OPERATOR", value: "i==", position: 4 },
      { type: "IDENTIFIER", value: "value", position: 8 },
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
      { type: "IDENTIFIER", value: "field", position: 1 },
      { type: "COMPARISON_OPERATOR", value: "!=", position: 7 },
      { type: "IDENTIFIER", value: "value", position: 10 },
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

  it("should throw when a reserved character is used in an identifier", () => {
    const input = "fi&eld value"
    const lexer = new Lexer(input)
    expect(() => lexer.tokenize()).toThrowErrorWithNameAndMessage(
      "LexerError",
      "Unexpected character '&' at position 2",
    )
  })

  it("should throw on unexpected character", () => {
    const input = "field & value"
    const lexer = new Lexer(input)
    expect(() => lexer.tokenize()).toThrowErrorWithNameAndMessage(
      "LexerError",
      "Unexpected character '&' at position 6",
    )
  })
})
