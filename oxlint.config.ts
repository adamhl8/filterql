import { oxlintConfig } from "@adamhl8/configs"
import { defineConfig } from "oxlint"

const config = oxlintConfig({
  rules: {
    "unicorn/no-null": "off",
  },
})

export default defineConfig(config)
