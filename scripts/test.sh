#!/usr/bin/env sh
# Runs every test unattended: rule, constraint and API tests (pytest), then the Playwright suite.
set -eu
cd "$(dirname "$0")/.."

export ENABLE_TEST_ROUTES=true

docker compose up --detach --build --wait db api web
docker compose exec -T api pytest
docker compose --profile e2e run --rm --build e2e
