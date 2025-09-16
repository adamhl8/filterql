import { knipConfig } from "@adamhl8/configs"

const config = knipConfig({
  project: ["!src/test-setup.ts"],
} as const)

export default config
