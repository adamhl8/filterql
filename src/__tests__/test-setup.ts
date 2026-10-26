import { expect } from "bun:test"

const isFunction = (fn: unknown): fn is () => unknown => typeof fn === "function"

expect.extend({
  toThrowErrorWithNameAndMessage: (fn, expectedName, expectedMessage) => {
    if (!isFunction(fn)) throw new Error("Expected a function as the first argument")

    let caughtError: Error | undefined
    try {
      fn()
    } catch (error) {
      caughtError = error instanceof Error ? error : new Error(String(error))
    }

    const pass = caughtError?.name === expectedName && caughtError.message === expectedMessage

    if (pass) {
      return {
        message: () => `Expected not to throw ${expectedName} with message "${expectedMessage}"`,
        pass: true,
      }
    }
    return {
      message: () =>
        `Expected to throw ${expectedName} with message "${expectedMessage}", but ${
          caughtError ? `got ${caughtError.name} with message "${caughtError.message}"` : "no error was thrown"
        }`,
      pass: false,
    }
  },
})

declare module "bun:test" {
  interface Matchers<T> {
    toThrowErrorWithNameAndMessage: (expectedName: string, expectedMessage: string) => void
  }

  interface AsymmetricMatchers {
    toThrowErrorWithNameAndMessage: (expectedName: string, expectedMessage: string) => void
  }
}
