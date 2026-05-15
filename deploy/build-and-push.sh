#!/bin/sh
# ---------------------------------------------------------------------------
# Build & Push script for the Meal Manager Nuxt image.
# Runs inside a docker:cli container with access to the host Docker daemon
# (via /var/run/docker.sock mounted in the companion docker-compose.yml).
#
# Overridable env vars (defaults shown):
#   REGISTRY    full image path without tag       dockregistry.xju.fr/meal-planning
#   IMAGE_TAG   tag to publish                    latest
#   GIT_REPO    HTTPS URL of the repo to clone    https://github.com/XjulI1/Meal-Planning.git
#   GIT_BRANCH  branch / ref to check out         main
# ---------------------------------------------------------------------------
set -eu

REGISTRY="${REGISTRY:-dockregistry.xju.fr/meal-planning}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GIT_REPO="${GIT_REPO:-https://github.com/XjulI1/Meal-Planning.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "========================================="
echo " meal-planning - Build & Push"
echo "========================================="
echo " Registry : ${REGISTRY}"
echo " Tag      : ${IMAGE_TAG}"
echo " Repo     : ${GIT_REPO}"
echo " Branch   : ${GIT_BRANCH}"
echo "========================================="

# Install git (the docker:cli image is Alpine-based and has no git).
apk add --no-cache git > /dev/null 2>&1

# Clone the requested branch into an ephemeral workdir.
WORK_DIR=$(mktemp -d)
trap 'rm -rf "${WORK_DIR}"' EXIT INT TERM

echo ""
echo "=> Cloning ${GIT_REPO} (branch ${GIT_BRANCH})..."
git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${WORK_DIR}"

# Build the image — --no-cache guarantees fresh deps on every run.
echo ""
echo "=> Building image: ${REGISTRY}:${IMAGE_TAG}"
docker build --no-cache -t "${REGISTRY}:${IMAGE_TAG}" "${WORK_DIR}"

# Push to the registry. Assumes the host daemon is already logged in
# (Synology > Container Manager > Registry > Settings, or `docker login`).
echo ""
echo "=> Pushing ${REGISTRY}:${IMAGE_TAG}"
docker push "${REGISTRY}:${IMAGE_TAG}"

echo ""
echo "========================================="
echo " ✓ Done — ${REGISTRY}:${IMAGE_TAG}"
echo "========================================="
