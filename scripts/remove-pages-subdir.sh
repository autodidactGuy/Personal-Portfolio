#!/usr/bin/env bash

set -euo pipefail

repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
token="${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
publish_branch="${PUBLISH_BRANCH:-gh-pages}"
target_subdir="${TARGET_SUBDIR:?TARGET_SUBDIR is required}"
commit_message="${COMMIT_MESSAGE:-Remove GitHub Pages preview directory}"

remote_url="https://x-access-token:${token}@github.com/${repo}.git"
workdir="$(mktemp -d)"

cleanup() {
  rm -rf "$workdir"
}

trap cleanup EXIT

if ! git ls-remote --exit-code --heads "$remote_url" "$publish_branch" >/dev/null 2>&1; then
  echo "Publish branch '${publish_branch}' does not exist yet."
  exit 0
fi

git clone --depth 1 --branch "$publish_branch" "$remote_url" "$workdir"

cd "$workdir"

if [ ! -d "$target_subdir" ]; then
  echo "Preview directory '${target_subdir}' does not exist."
  exit 0
fi

rm -rf "$target_subdir"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add -A

if git diff --cached --quiet; then
  echo "No Pages cleanup changes to publish."
  exit 0
fi

git commit -m "$commit_message"
git push origin "$publish_branch"
