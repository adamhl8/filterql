import { vitestConfig } from "@adamhl8/configs"
import { defineConfig } from "vitest/config"

const config = vitestConfig({
  test: {
    setupFiles: ["./src/test-setup.ts"],
  },
})

export default defineConfig(config)
