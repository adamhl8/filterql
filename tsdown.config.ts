import { tsdownConfig } from "@adamhl8/configs"
import { defineConfig } from "tsdown"

const config = tsdownConfig({ platform: "neutral" } as const)

export default defineConfig(config)
