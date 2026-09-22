process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://asan:asan_dev_password@127.0.0.1:5432/asan_invest_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-min-32-chars-xx";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars-xx";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.UPLOAD_DIR = "./uploads";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

import { execSync } from "child_process";

execSync("npx prisma migrate deploy", {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
