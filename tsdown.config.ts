import { tsdownConfig } from "@adamhl8/configs"
import { defineConfig } from "tsdown"

const config = tsdownConfig({ platform: "neutral", failOnWarn: false })

export default defineConfig(config)
