import { FilterEvaluator } from "~/filter-evaluator/filter-evaluator.js"
import { Lexer } from "~/lexer/lexer.js"
import { OperationEvaluator } from "~/operation-evaluator/operation-evaluator.js"
import type { OperationMap } from "~/operation-evaluator/types.js"
import { Parser } from "~/parser/parser.js"
import type { ASTNode, FilterNode, OperationNode } from "~/parser/types.js"
import type { DataObject, FilterQLOptions, RequiredFilterQLOptions, Schema } from "~/types.js"

const DEFAULT_OPTIONS: RequiredFilterQLOptions = { allowUnknownFields: false }

interface FilterQLArguments {
  schema: Schema
  options?: FilterQLOptions
  customOperations?: OperationMap
}

export class FilterQL {
  private readonly options: RequiredFilterQLOptions
  private readonly lexer: Lexer
  private readonly parser: Parser
  private readonly filterEvaluator: FilterEvaluator
  private readonly operationEvaluator: OperationEvaluator

  public constructor({ schema, options, customOperations }: FilterQLArguments) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.lexer = new Lexer()
    this.parser = new Parser()
    this.filterEvaluator = new FilterEvaluator(schema, this.options)
    this.operationEvaluator = new OperationEvaluator(schema, this.options, customOperations)
  }

  /**
   * Filter and apply operations to a data array with the given query
   */
  public query<T extends DataObject>(data: T[], query: string): T[] {
    if (!query.trim()) return data

    const ast = this.parse(query)
    const filteredData = this.applyFilter(data, ast.filter)
    return this.applyOperations(filteredData, ast.operations)
  }

  /**
   * Parse a query string into an `ASTNode` containing the `FilterNode` and `OperationNode[]`
   *
   * You can use the returned `ASTNode` with the `applyFilter` and `applyOperations` methods
   */
  public parse(query: string): ASTNode {
    return this.parser.parse(this.lexer.tokenize(query))
  }

  /** Apply the given `FilterNode` to a data array */
  public applyFilter<T extends DataObject>(data: T[], filter: FilterNode): T[] {
    return this.filterEvaluator.filter(data, filter)
  }

  /** Apply the given `OperationNode[]` to a data array */
  public applyOperations<T extends DataObject>(data: T[], operations: OperationNode[]): T[] {
    return this.operationEvaluator.apply(data, operations)
  }
}
