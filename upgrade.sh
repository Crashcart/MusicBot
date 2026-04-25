#!/bin/bash
set -e

echo "======================================"
echo "     MusicBot Upgrade Script          "
echo "======================================"
echo "Starting upgrade at: $(date)"

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: Please run this script as root."
  exit 1
fi

INSTALL_DIR="/opt/musicbot"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "ERROR: MusicBot is not installed at $INSTALL_DIR."
    exit 1
fi

cd "$INSTALL_DIR" || exit 1

echo ""
echo "-> Pulling latest changes from Git..."
if ! git pull origin main; then
    echo "ERROR: Failed to pull latest changes"
    echo "       You may need to resolve merge conflicts manually"
    exit 1
fi
echo "✓ Git pull successful"

echo ""
echo "-> Rebuilding Docker images and pulling updates..."
if ! docker compose pull; then
    echo "ERROR: Failed to pull Docker images"
    exit 1
fi
if ! docker compose build; then
    echo "ERROR: Failed to build Docker images"
    exit 1
fi
echo "✓ Docker images rebuilt"

echo ""
echo "-> Restarting containers..."
if ! docker compose up -d; then
    echo "ERROR: Failed to restart containers"
    docker compose logs --tail=20 2>&1 | sed 's/^/  /'
    exit 1
fi
echo "✓ Containers restarted"

echo ""
sleep 3
echo "-> Checking container health..."
unhealthy=""
for container in musicbot-core musicbot-web; do
    if docker inspect "$container" >/dev/null 2>&1; then
        state="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo unknown)"
        if [ "$state" = "true" ]; then
            echo "  ✓ $container is running"
        else
            echo "  ✗ $container is not running (state: $state)"
            unhealthy="$unhealthy $container"
        fi
    fi
done

if [ -n "$unhealthy" ]; then
    echo ""
    echo "ERROR: Some containers failed to start:$unhealthy"
    echo ""
    echo "Logs:"
    for container in $unhealthy; do
        echo ""
        echo "  --- $container ---"
        docker logs --tail=20 "$container" 2>&1 | sed 's/^/  /' || true
    done
    exit 1
fi

echo "======================================"
echo "          Upgrade Complete!           "
echo "======================================"
