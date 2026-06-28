import { describe, expect, it } from "vitest"

import { OperationEvaluator } from "#/operation-evaluator/operation-evaluator.ts"
import type { OperationFn } from "#/operation-evaluator/types.ts"
import { parseQuery, testData, testOptions, testSchema } from "#/test-utils.ts"

describe("OperationEvaluator", () => {
  describe("default operations", () => {
    describe("LIMIT", () => {
      it("should limit number of data objects based on the LIMIT operation", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | LIMIT 2")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(2)
      })

      it("should throw when limit is not a number", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | LIMIT foo")
        expect(() => operationEvaluator.apply(testData, node.operations)).toThrowErrorWithNameAndMessage(
          "Error",
          "Invalid number argument 'foo' for operation 'LIMIT'",
        )
      })

      it("should throw when limit is negative", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | LIMIT -1")
        expect(() => operationEvaluator.apply(testData, node.operations)).toThrowErrorWithNameAndMessage(
          "Error",
          "Number argument '-1' for operation 'LIMIT' cannot be negative",
        )
      })
    })

    describe("sort", () => {
      it("should sort the data by title", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT title")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
        expect(result.map((r) => r.title)).toStrictEqual([
          "Inception",
          "Interstellar",
          "The Dark Knight",
          "The Matrix",
          "The Matrix Reloaded",
        ])
      })

      it("should sort the data by title alias", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT t")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
        expect(result.map((r) => r.title)).toStrictEqual([
          "Inception",
          "Interstellar",
          "The Dark Knight",
          "The Matrix",
          "The Matrix Reloaded",
        ])
      })

      it("should sort the data by year", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT year")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
        expect(result.map((r) => r.year)).toStrictEqual([1999, 2003, 2008, 2010, 2014])
      })

      it("should sort the data by rating", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT rating")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
        expect(result.map((r) => r.rating)).toStrictEqual([7.2, 8.6, 8.7, 8.8, 9])
      })

      it("should sort the data by title in descending order", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT title desc")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
        expect(result.map((r) => r.title)).toStrictEqual([
          "The Matrix Reloaded",
          "The Matrix",
          "The Dark Knight",
          "Interstellar",
          "Inception",
        ])
      })

      it("should sort to same order when the field does not exist in the data", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT foo")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
        expect(result.map((r) => r.title)).toStrictEqual([
          "The Matrix",
          "The Matrix Reloaded",
          "Inception",
          "Interstellar",
          "The Dark Knight",
        ])
      })

      it("should not throw on unknown field when 'allowUnknownFields' is true", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, { allowUnknownFields: true })
        const node = parseQuery("* | SORT unknownField")
        const result = operationEvaluator.apply(testData, node.operations)
        expect(result).toHaveLength(5)
      })

      it("should throw on unknown field", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT invalid")
        expect(() => operationEvaluator.apply(testData, node.operations)).toThrowErrorWithNameAndMessage(
          "Error",
          "Unknown field 'invalid' for operation 'SORT'",
        )
      })

      it("should throw on invalid direction argument", () => {
        const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
        const node = parseQuery("* | SORT title invalid")
        expect(() => operationEvaluator.apply(testData, node.operations)).toThrowErrorWithNameAndMessage(
          "Error",
          "Invalid direction argument 'invalid' for operation 'SORT': should be either 'asc' or 'desc'",
        )
      })
    })
  })

  describe("custom operations", () => {
    it("should handle overridden default operation", () => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion unicorn/consistent-function-scoping
      const customLimit: OperationFn = <T>() => [{ title: "custom limit" }] as T[]
      const operationEvaluator = new OperationEvaluator(testSchema, testOptions, { LIMIT: customLimit })
      const node = parseQuery("* | LIMIT")
      const result = operationEvaluator.apply(testData, node.operations)
      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("custom limit")
    })

    it("should handle custom operation", () => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion unicorn/consistent-function-scoping
      const MYOP: OperationFn = <T>() => [{ title: "my op" }, { title: "my op2" }] as T[]
      const operationEvaluator = new OperationEvaluator(testSchema, testOptions, { MYOP })
      const node = parseQuery("* | MYOP | LIMIT 1")
      const result = operationEvaluator.apply(testData, node.operations)
      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("my op")
    })

    it("should throw on invalid direction argument", () => {
      const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
      const node = parseQuery("* | SORT title invalid")
      expect(() => operationEvaluator.apply(testData, node.operations)).toThrowErrorWithNameAndMessage(
        "Error",
        "Invalid direction argument 'invalid' for operation 'SORT': should be either 'asc' or 'desc'",
      )
    })
  })

  describe("error handling", () => {
    it("should throw on unknown operation", () => {
      const operationEvaluator = new OperationEvaluator(testSchema, testOptions)
      const node = parseQuery("* | UNKNOWN")
      expect(() => operationEvaluator.apply(testData, node.operations)).toThrowErrorWithNameAndMessage(
        "OperationEvaluatorError",
        "Unknown operation 'UNKNOWN'",
      )
    })

    it("should throw when custom operation key is not uppercase", () => {
      expect(
        () => new OperationEvaluator(testSchema, testOptions, { myOp: (data) => data }),
      ).toThrowErrorWithNameAndMessage("OperationEvaluatorError", "Custom operation key 'myOp' must be uppercase")
    })
  })
})
