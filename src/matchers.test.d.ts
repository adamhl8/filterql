declare module "bun:test" {
  interface Matchers {
    toThrowErrorWithNameAndMessage(expectedName: string, expectedMessage: string): void
  }

  interface AsymmetricMatchers {
    toThrowErrorWithNameAndMessage(expectedName: string, expectedMessage: string): void
  }
}
