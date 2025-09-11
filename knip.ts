import { knipConfig } from "@adamhl8/configs"
import type { KnipConfig } from "knip"

const config = knipConfig({
  project: ["!src/test-setup.ts"],
} as const) satisfies KnipConfig

export default config
