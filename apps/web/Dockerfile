FROM node:22-slim

RUN npm install -g bun@1.3.12

WORKDIR /repo
COPY . .
RUN bun install --frozen-lockfile

ARG API_ORIGIN=http://api:8000
ENV API_ORIGIN=$API_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1

RUN bunx turbo run build --filter=web

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["bun", "run", "start"]
