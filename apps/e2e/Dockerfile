FROM mcr.microsoft.com/playwright:v1.65.0-noble

RUN npm install -g bun@1.3.12

WORKDIR /repo
COPY . .
RUN bun install --frozen-lockfile

WORKDIR /repo/apps/e2e
CMD ["bunx", "playwright", "test"]
