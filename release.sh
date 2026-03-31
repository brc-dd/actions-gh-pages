#!/usr/bin/env bash

# fail on unset variables and command errors
set -eu -o pipefail # -x: is for debugging

CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "${CURRENT_BRANCH}" ]; then
  echo "$0: Current branch is empty"
  exit 1
fi

RELEASE_TYPE_LIST="prerelease prepatch preminor premajor patch minor major"

if command -v fzf >/dev/null 2>&1; then
  RELEASE_TYPE=$(echo "${RELEASE_TYPE_LIST}" | tr ' ' '\n' | fzf --layout=reverse)
else
  select sel in ${RELEASE_TYPE_LIST}; do
    RELEASE_TYPE="${sel}"
    break
  done
fi

echo "$0: Create ${RELEASE_TYPE} release, continue? (y/n)"
read -r res
if [ "${res}" = "n" ]; then
  echo "$0: Stop script"
  exit 0
fi

git fetch origin --tags --force
git pull --ff-only origin "${CURRENT_BRANCH}"

npm ci

npm run build
git add --all ./lib
git commit -m "chore(release): Add build assets"

npm run release -- --release-as "${RELEASE_TYPE}" --preset eslint

git rm -r --ignore-unmatch ./lib
git commit -m "chore(release): Remove build assets [skip ci]"

git push origin "${CURRENT_BRANCH}"

TAG_NAME="v$(node -p "require('./package.json').version")"
git push origin "${TAG_NAME}"

if [[ "${TAG_NAME}" =~ ^v([0-9]+)\.[0-9]+\.[0-9]+$ ]]; then
  BASE_TAG="v${BASH_REMATCH[1]}"
  TAG_COMMIT="$(git rev-list -n 1 "${TAG_NAME}")"
  git tag -fa "${BASE_TAG}" -m "Release ${BASE_TAG}" "${TAG_COMMIT}"
  git push origin "${BASE_TAG}" --force
fi
