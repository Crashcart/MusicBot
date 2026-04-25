#!/bin/bash
set -e

echo "======================================"
echo "    MusicBot Installation Script      "
echo "======================================"

if [[ "$EUID" -ne 0 ]]; then
  echo "Please run this script as root (curl -sL <url> | sudo bash)"
  exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

INSTALL_DIR="/opt/musicbot"
REPO_URL="https://github.com/Crashcart/MusicBot.git"

if [ -d "$INSTALL_DIR" ]; then
    echo "Directory $INSTALL_DIR already exists. Use the upgrade script instead."
    exit 1
fi

# Detect a free host port for the web portal, starting at 3000.
pick_free_port() {
    local candidate=3000
    while [ "$candidate" -lt 3100 ]; do
        if ! (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | awk '{print $4}' | grep -Eq "[:.]${candidate}\$"; then
            echo "$candidate"
            return 0
        fi
        candidate=$((candidate + 1))
    done
    echo ""
    return 1
}

WEB_PORT="$(pick_free_port || true)"
if [ -z "$WEB_PORT" ]; then
    echo "Error: no free port found in range 3000-3099 for the web portal."
    echo "       Free a port or set WEB_PORT manually in /opt/musicbot/.env after install."
    exit 1
fi

if [ "$WEB_PORT" != "3000" ]; then
    echo "Notice: port 3000 is in use. Web portal will listen on host port $WEB_PORT."
fi

# If anything fails after we clone, roll back so re-running install works cleanly.
cleanup_on_failure() {
    local exit_code=$?
    if [ "$exit_code" -ne 0 ] && [ -d "$INSTALL_DIR" ]; then
        echo ""
        echo "Installation failed (exit $exit_code). Rolling back $INSTALL_DIR..."
        (cd "$INSTALL_DIR" && docker compose down -v --remove-orphans 2>/dev/null) || true
        rm -rf "$INSTALL_DIR"
        echo "Rollback complete. You can safely re-run the installer."
    fi
    exit "$exit_code"
}
trap cleanup_on_failure EXIT

echo "-> Cloning repository into $INSTALL_DIR..."
git clone "$REPO_URL" "$INSTALL_DIR"

cd "$INSTALL_DIR"

echo "-> Setting up environment variables..."
cp .env.example .env
# Persist the chosen host port so docker compose picks it up.
if grep -q '^WEB_PORT=' .env; then
    sed -i "s/^WEB_PORT=.*/WEB_PORT=${WEB_PORT}/" .env
else
    echo "WEB_PORT=${WEB_PORT}" >> .env
fi
echo "Notice: A default .env file has been created at $INSTALL_DIR/.env."
echo "        Update DISCORD_TOKEN and Lidarr settings before the bot will be useful."

echo "-> Starting core Docker containers..."
docker compose up -d bot web

trap - EXIT

echo "======================================"
echo " Installation Complete! "
echo " Portal: http://localhost:${WEB_PORT} "
echo " Directory: $INSTALL_DIR"
echo "======================================"
