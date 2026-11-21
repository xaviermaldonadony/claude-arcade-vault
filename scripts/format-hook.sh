#!/usr/bin/env bash
# PostToolUse hook: format files Claude wrote.
# - Prettier for every type it can parse.
# - Strip trailing whitespace and ensure final newline for types Prettier cannot parse.
# - ESLint --fix for JS/TS after Prettier.
# Reads hook JSON on stdin. Exit 2 feeds errors back to Claude.

set -u

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  "$project_dir"/*) ;;
  *) exit 0 ;;
esac

cd "$project_dir" || exit 0

info="$(npx --no-install prettier --file-info "$file" 2>/dev/null)"
[ "$(printf '%s' "$info" | jq -r '.ignored // false')" = "true" ] && exit 0
parser="$(printf '%s' "$info" | jq -r '.inferredParser // empty')"

if [ -n "$parser" ]; then
  prettier_out="$(npx --no-install prettier --write "$file" 2>&1)" || {
    printf '%s\n' "$prettier_out" >&2
    exit 2
  }
else
  case "$file" in
    *.md|*.mdx) ;;  # trailing double space is a markdown line break
    *)
      sed -i '' -E 's/[[:space:]]+$//' "$file"
      [ -n "$(tail -c1 "$file")" ] && printf '\n' >> "$file"
      ;;
  esac
fi

case "$file" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    lint_out="$(npx --no-install eslint --fix "$file" 2>&1)" || {
      printf '%s\n' "$lint_out" >&2
      exit 2
    }
    ;;
esac

exit 0
