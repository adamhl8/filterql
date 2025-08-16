import { Evaluator } from "~/evaluator/evaluator.js"
import type { Data, EvaluatorOptions, Schema } from "~/evaluator/types.js"
import { Lexer } from "~/lexer/lexer.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode } from "~/parser/types.js"

export interface FilterQLOptions extends EvaluatorOptions {}

const DEFAULT_OPTIONS: FilterQLOptions = { allowUnknownFields: false }

export class FilterQL {
  private readonly options: FilterQLOptions
  private readonly evaluator: Evaluator

  public constructor(schema: Schema, options?: FilterQLOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.evaluator = new Evaluator(schema, this.options)
  }

  /**
   * Parse a query string into an AST
   */
  private parseQuery(query: string): ASTNode {
    const lexer = new Lexer(query)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens)
    return parser.parse()
  }

  /**
   * Filter an array of objects based on a query
   */
  public filter<T extends Data>(data: T[], query: string): T[] {
    if (!query.trim()) return data

    const ast = this.parseQuery(query)
    return data.filter((item) => this.evaluator.evaluate(ast, item))
  }
}
