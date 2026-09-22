FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
RUN npx prisma generate
RUN mkdir -p /app/uploads && addgroup -S asan && adduser -S asan -G asan && chown -R asan:asan /app
USER asan
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
