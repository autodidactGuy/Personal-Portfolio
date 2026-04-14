#!/usr/bin/env bash

set -euo pipefail

repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
token="${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
source_dir="${SOURCE_DIR:-out}"
publish_branch="${PUBLISH_BRANCH:-gh-pages}"
target_subdir="${TARGET_SUBDIR:-}"
preserve_dir="${PRESERVE_DIR:-}"
commit_message="${COMMIT_MESSAGE:-Update GitHub Pages content}"

if [ ! -d "$source_dir" ]; then
  echo "Source directory '$source_dir' does not exist."
  exit 1
fi

source_dir="$(cd "$source_dir" && pwd)"
remote_url="https://x-access-token:${token}@github.com/${repo}.git"
workdir="$(mktemp -d)"

cleanup() {
  rm -rf "$workdir"
}

trap cleanup EXIT

if git ls-remote --exit-code --heads "$remote_url" "$publish_branch" >/dev/null 2>&1; then
  git clone --depth 1 --branch "$publish_branch" "$remote_url" "$workdir"
else
  git clone --depth 1 "$remote_url" "$workdir"
  (
    cd "$workdir"
    git checkout --orphan "$publish_branch"
    git rm -rf . >/dev/null 2>&1 || true
  )
fi

cd "$workdir"

if [ -n "$target_subdir" ]; then
  mkdir -p "$target_subdir"
  rsync -a --delete "${source_dir}/" "${workdir}/${target_subdir}/"
else
  rsync_args=(-a --delete)

  if [ -n "$preserve_dir" ]; then
    rsync_args+=(--exclude "${preserve_dir}/")
  fi

  rsync "${rsync_args[@]}" "${source_dir}/" "${workdir}/"
fi

touch .nojekyll

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add -A

if git diff --cached --quiet; then
  echo "No Pages changes to publish."
  exit 0
fi

git commit -m "$commit_message"
git push origin "$publish_branch"
