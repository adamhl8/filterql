import { BaseEvaluator } from "~/base-evaluator.js"
import { defaultOperations } from "~/operation-evaluator/operations.js"
import type { OperationMap } from "~/operation-evaluator/types.js"
import type { OperationNode } from "~/parser/types.js"
import type { DataObject, RequiredFilterQLOptions, Schema } from "~/types.js"

export class OperationEvaluator extends BaseEvaluator {
  private readonly operationMap: OperationMap

  public constructor(schema: Schema, options: RequiredFilterQLOptions, customOperations?: OperationMap) {
    super(schema, options)

    if (customOperations)
      for (const key of Object.keys(customOperations))
        if (key !== key.toUpperCase())
          throw new OperationEvaluatorError(`Custom operation key '${key}' must be uppercase`)

    this.operationMap = { ...defaultOperations, ...customOperations }
  }

  /**
   * Applies all operations to the given data
   */
  public apply<T extends DataObject>(data: T[], operations: OperationNode[]): T[] {
    let newData = data

    for (const operation of operations) {
      const operationFn = this.operationMap[operation.name.toUpperCase()]
      if (!operationFn) throw new OperationEvaluatorError(`Unknown operation '${operation.name}'`)

      // need to form closure around `this.resolveField` so the correct `this` is used when called from the operation function
      const resolveField = (fieldOrAlias: string) => this.resolveField(fieldOrAlias)
      newData = operationFn(newData, operation.args, { schema: this.schema, options: this.options, resolveField })
    }

    return newData
  }
}

class OperationEvaluatorError extends Error {
  public constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = "OperationEvaluatorError"
  }
}
