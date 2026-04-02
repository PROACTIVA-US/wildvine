import type { WildvineConfig } from "../../config/types.js";

export type DirectoryConfigParams = {
  cfg: WildvineConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
