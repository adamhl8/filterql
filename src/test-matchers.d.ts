import { Matchers } from "vitest"

declare module "vitest" {
  interface Matchers {
    toThrowErrorWithNameAndMessage: (expectedName: string, expectedMessage: string) => void
  }
}
