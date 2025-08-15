import { expect } from "bun:test"

expect.extend({
  toThrowErrorWithNameAndMessage(callback, expectedName, expectedMessage) {
    if (typeof callback !== "function") throw new Error("Expected a function as the first argument")
    let caughtError: Error | undefined
    try {
      callback()
    } catch (error) {
      caughtError = error as Error
    }

    const pass = caughtError?.name === expectedName && caughtError?.message === expectedMessage

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
