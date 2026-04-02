import { resolveActiveTalkProviderConfig } from "../../config/talk.js";
import type { WildvineConfig } from "../../config/types.js";

export { resolveActiveTalkProviderConfig };

export function getRuntimeConfigSnapshot(): WildvineConfig | null {
  return null;
}
