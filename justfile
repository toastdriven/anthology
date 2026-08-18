# https://just.systems/
set dotenv-load := false

@_default:
    just --list

setup:
    bun install

lint:
    bunx tsc --noEmit -p tsconfig.json

format:
    bunx prettier "**/*.ts" --write

format-check:
    bunx prettier "**/*.ts" --check

@test:
    bun test

# compile target="bun-darwin-arm64" out="./dist/anthology":
#     mkdir -p ./dist
#     bun build ./anthology.ts --compile --target {{target}} --outfile {{out}}
#
# compile-all:
#     just compile "bun-linux-x64" "./dist/anthology-linux-x64"
#     just compile "bun-linux-arm64" "./dist/anthology-linux-arm64"
#     just compile "bun-darwin-x64" "./dist/anthology-darwin-x64"
#     just compile "bun-darwin-arm64" "./dist/anthology-darwin-arm64"

# Exports the OpenAPI schema to a well-formatted JSON file (for validation purposes).
# Requires the Anthology server to be running.
@export-schema:
    curl \
        -X GET \
        -H "Content-Type: application/json" \
        --silent \
        --show-error \
        http://0.0.0.0:8080/schema \
        | python -m json \
        > ./reformatted-schema.json

@build-docs:
    cd docs && mdbook build

publish-docs branch="gh-pages":
    ./scripts/publish-docs.sh "{{branch}}"

publish-release version:
    ./scripts/publish-release.sh "{{version}}"
