import { logger } from "../../lib/logger";

/** FR-AUTH-02: interface only. No live government client in Phase 1. */
export const asanLoginStub = {
  start() {
    logger.warn("ASAN Login / SİMA adapter is a stub");
    return {
      provider: "asan_login",
      available: false,
      identificationLevelIfCompleted: "LEGAL",
      message:
        "ASAN Login is not connected in Phase 1. Use email registration (level 1) and continue legal actions via a representative or when the provider is specified.",
    };
  },
};
