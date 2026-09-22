process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-change-me-32chars";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-change-me-32char";
process.env.BCRYPT_ROUNDS = "4";
process.env.DATABASE_URL = "postgresql://asan:asan_dev_password@127.0.0.1:5432/asan_invest?schema=public";
