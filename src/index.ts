import { Evaluator } from "~/evaluator.js"
import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode, Schema } from "~/parser/types.js"

/**
 * Parse a query string into an AST
 */
export function parse(query: string, schema: Schema): ASTNode {
  const lexer = new Lexer(query)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens, schema)
  return parser.parse()
}

export class FilterQL {
  private readonly schema: Schema
  private readonly evaluator: Evaluator

  public constructor(schema: Schema) {
    this.schema = schema
    this.evaluator = new Evaluator()
  }

  /**
   * Filter an array of objects based on a query
   */
  public filter<T extends Record<string | number | symbol, unknown>>(data: T[], query: string): T[] {
    if (!query.trim()) return data

    const ast = parse(query, this.schema)
    return data.filter((item) => this.evaluator.evaluate(ast, item))
  }
}

export type { Schema } from "~/parser/types.js"
