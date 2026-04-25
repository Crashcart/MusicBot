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

# Check whether a TCP port is bound on this host.
# Tries lsof, then /proc/net/tcp{,6}. Returns 0 if in use, 1 if free, 2 if undetectable.
port_in_use() {
    local port="$1"

    if command -v lsof &> /dev/null; then
        lsof -iTCP:"$port" -sTCP:LISTEN -P -n >/dev/null 2>&1
        return $?
    fi

    if [ -r /proc/net/tcp ]; then
        local hex
        hex=$(printf '%04X' "$port")
        # Local address column is index 2: "IP:PORT" in hex. Match ":HEX " followed by state 0A (LISTEN).
        if grep -E "^[[:space:]]*[0-9]+:[[:space:]]+[0-9A-F]+:${hex}[[:space:]]+[0-9A-F]+:[0-9A-F]+[[:space:]]+0A" \
                /proc/net/tcp /proc/net/tcp6 >/dev/null 2>&1; then
            return 0
        fi
        return 1
    fi

    return 2
}

# Detect a free host port for the web portal, starting at 3000.
pick_free_port() {
    local candidate=3000
    while [ "$candidate" -lt 3100 ]; do
        port_in_use "$candidate"
        local rc=$?
        if [ "$rc" -eq 1 ]; then
            echo "$candidate"
            return 0
        fi
        if [ "$rc" -eq 2 ]; then
            # No detection method available; trust default and let docker surface a real conflict.
            echo "Notice: cannot probe ports (no lsof or /proc/net/tcp). Assuming $candidate is free." >&2
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
        # Stop containers but DO NOT pass -v: that would wipe data volumes if anything was written.
        (cd "$INSTALL_DIR" && docker compose down --remove-orphans 2>/dev/null) || true
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

# Disable rollback before health check: if a container is unhealthy because of a
# placeholder DISCORD_TOKEN, we want the install to stay in place so the user can
# edit .env, not get rolled back.
trap - EXIT

echo "-> Verifying containers..."
sleep 5
unhealthy=""
for container in musicbot-core musicbot-web; do
    state="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo unknown)"
    if [ "$state" = "true" ]; then
        echo "  ✓ $container is running"
    else
        echo "  ✗ $container is not running (state: $state)"
        docker logs --tail=15 "$container" 2>&1 | sed 's/^/    /' || true
        unhealthy="$unhealthy $container"
    fi
done

echo "======================================"
echo " Installation Complete! "
echo " Portal: http://localhost:${WEB_PORT} "
echo " Directory: $INSTALL_DIR"
echo "======================================"

if [ -n "$unhealthy" ]; then
    echo ""
    echo "⚠ The following containers are not running:$unhealthy"
    echo "  This is normal on first install if DISCORD_TOKEN/LIDARR_API_KEY"
    echo "  are still placeholders. Edit /opt/musicbot/.env and run:"
    echo "    cd /opt/musicbot && docker compose up -d"
fi
