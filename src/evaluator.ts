import type { ASTNode, ComparisonNode, LogicalOpNode, NotOpNode } from "~/parser/types.js"
import { isStringComparisonNode } from "~/parser/types.js"

export class Evaluator {
  /**
   * Evaluate an AST node against a data object
   */
  public evaluate(node: ASTNode, data: Record<string, unknown>): boolean {
    switch (node.type) {
      case "comparison":
        return this.evaluateComparison(node, data)
      case "and":
        return this.evaluateLogical(node, data)
      case "or":
        return this.evaluateLogical(node, data)
      case "not":
        return this.evaluateNot(node, data)
      default:
        throw new Error(`Unexpected node '${JSON.stringify(node)}'`)
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ignore
  private evaluateComparison(node: ComparisonNode, data: Record<string, unknown>): boolean {
    const dataValue = data[node.field]

    if (!isStringComparisonNode(node)) {
      const { value: comparisonValueNum } = node
      const dataValueNum = Number(dataValue)
      if (node.operator === ">=") return dataValueNum >= comparisonValueNum
      return dataValueNum <= comparisonValueNum
    }

    const handleCaseSensitivity = (value: string) => (node.isCaseInsensitive ? value.toLowerCase() : value)

    let { value: comparisonValue } = node
    comparisonValue = handleCaseSensitivity(comparisonValue)
    const dataValueString = handleCaseSensitivity(String(dataValue))

    const isEmpty = (value: unknown) => value === null || value === undefined || value === ""
    // if the comparison value is "", it's an empty check
    if (comparisonValue === "") {
      if (node.operator === "==") return isEmpty(dataValue)
      if (node.operator === "!=") return !isEmpty(dataValue)
      // it doesn't make sense to do empty checks with other operators
      return false
    }

    if (node.operator === "==") return dataValueString === comparisonValue
    if (node.operator === "!=") return dataValueString !== comparisonValue
    if (node.operator === "*=") return dataValueString.includes(comparisonValue)
    if (node.operator === "^=") return dataValueString.startsWith(comparisonValue)
    if (node.operator === "$=") return dataValueString.endsWith(comparisonValue)
    if (node.operator === "~=") {
      try {
        const flags = node.isCaseInsensitive ? "i" : ""
        // using comparisonValue/dataValueString (which are lowercase) wouldn't make sense here
        const regex = new RegExp(node.value, flags)
        return regex.test(String(dataValue))
      } catch {
        return false
      }
    }

    throw new Error(`Unexpected comparison operator '${node.operator}'`)
  }

  private evaluateLogical(node: LogicalOpNode, data: Record<string, unknown>): boolean {
    const leftResult = this.evaluate(node.left, data)
    const rightResult = this.evaluate(node.right, data)

    switch (node.type) {
      case "and":
        return leftResult && rightResult
      case "or":
        return leftResult || rightResult
      default:
        throw new Error(`Unexpected logical operator '${node.type}'`)
    }
  }

  private evaluateNot(node: NotOpNode, data: Record<string, unknown>): boolean {
    return !this.evaluate(node.operand, data)
  }
}
