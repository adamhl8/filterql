import { oxlintConfig } from "@adamhl8/configs"
import { defineConfig } from "oxlint"

const config = oxlintConfig({
  rules: {
    "unicorn/no-null": "off",
  },
} as const)

export default defineConfig(config)
