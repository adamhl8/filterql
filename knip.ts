import type { KnipConfig } from "knip"

const config: KnipConfig = {
  entry: ["src/filterql.ts", "**/*.test.ts"],
  project: ["**", "!src/test-setup.ts"],
}

// biome-ignore lint/style/noDefaultExport: needs to be default
export default config
