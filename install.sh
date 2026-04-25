#!/bin/bash
set -e

echo "======================================"
echo "    MusicBot Installation Script      "
echo "======================================"
echo "Starting installation at: $(date)"
echo "System: $(uname -a)"

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: Please run this script as root (curl -sL <url> | sudo bash)"
  exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    echo "  See: https://docs.docker.com/get-docker/"
    exit 1
else
    echo "✓ Docker found: $(docker --version)"
fi

if ! command -v git &> /dev/null; then
    echo "ERROR: git is not installed. Please install git first."
    exit 1
else
    echo "✓ Git found: $(git --version)"
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
    echo "Scanning for free port in range 3000-3099..." >&2
    while [ "$candidate" -lt 3100 ]; do
        port_in_use "$candidate"
        local rc=$?
        if [ "$rc" -eq 1 ]; then
            echo "✓ Found free port: $candidate" >&2
            echo "$candidate"
            return 0
        fi
        if [ "$rc" -eq 2 ]; then
            # No detection method available; trust default and let docker surface a real conflict.
            echo "⚠ Warning: cannot probe ports (no lsof or /proc/net/tcp). Assuming port $candidate is free." >&2
            echo "$candidate"
            return 0
        fi
        candidate=$((candidate + 1))
    done
    echo "ERROR: No free ports in range 3000-3099" >&2
    echo ""
    return 1
}

WEB_PORT="$(pick_free_port || true)"
if [ -z "$WEB_PORT" ]; then
    echo ""
    echo "ERROR: No free ports in range 3000-3099 for the web portal."
    echo "       Free a port manually and retry, or set WEB_PORT manually in .env after install."
    echo ""
    echo "       To find what's using your ports:"
    echo "       $ sudo lsof -iTCP:3000-3100 -sTCP:LISTEN"
    exit 1
fi

if [ "$WEB_PORT" != "3000" ]; then
    echo "ℹ Port 3000 is in use. Web portal will listen on host port $WEB_PORT."
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

echo ""
echo "-> Cloning repository into $INSTALL_DIR..."
if ! git clone "$REPO_URL" "$INSTALL_DIR"; then
    echo "ERROR: Failed to clone repository from $REPO_URL"
    exit 1
fi
echo "✓ Repository cloned successfully"

cd "$INSTALL_DIR" || exit 1

echo ""
echo "-> Setting up environment variables..."
if [ ! -f ".env.example" ]; then
    echo "ERROR: .env.example not found in cloned repository"
    exit 1
fi
cp .env.example .env
echo "✓ Created .env from .env.example"
# Persist the chosen host port so docker compose picks it up.
if grep -q '^WEB_PORT=' .env; then
    sed -i "s/^WEB_PORT=.*/WEB_PORT=${WEB_PORT}/" .env
else
    echo "WEB_PORT=${WEB_PORT}" >> .env
fi
echo "Notice: A default .env file has been created at $INSTALL_DIR/.env."
echo "        Update DISCORD_TOKEN and Lidarr settings before the bot will be useful."

echo ""
echo "-> Starting core Docker containers..."
if ! docker compose up -d bot web; then
    echo "ERROR: Failed to start Docker containers"
    docker compose logs --tail=20 2>&1 | sed 's/^/  /'
    exit 1
fi
echo "✓ Docker containers started"

# Disable rollback before health check: if a container is unhealthy because of a
# placeholder DISCORD_TOKEN, we want the install to stay in place so the user can
# edit .env, not get rolled back.
trap - EXIT

echo ""
echo "-> Verifying containers (waiting 5 seconds for startup)..."
sleep 5
unhealthy=""
for container in musicbot-core musicbot-web; do
    if docker inspect "$container" >/dev/null 2>&1; then
        state="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo unknown)"
        if [ "$state" = "true" ]; then
            echo "  ✓ $container is running"
        else
            echo "  ✗ $container is not running (state: $state)"
            echo "    Recent logs:"
            docker logs --tail=10 "$container" 2>&1 | sed 's/^/      /' || true
            unhealthy="$unhealthy $container"
        fi
    else
        echo "  ✗ $container does not exist"
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
    echo "⚠ Warning: Some containers are not running:$unhealthy"
    echo ""
    echo "  This is NORMAL on first install if DISCORD_TOKEN or LIDARR_API_KEY"
    echo "  are still placeholder values."
    echo ""
    echo "  To fix:"
    echo "  1. Edit $INSTALL_DIR/.env and set real values:"
    echo "     DISCORD_TOKEN=your_actual_token"
    echo "     LIDARR_URL=http://your-lidarr-url"
    echo "     LIDARR_API_KEY=your_lidarr_api_key"
    echo ""
    echo "  2. Restart the containers:"
    echo "     cd $INSTALL_DIR && docker compose up -d"
    echo ""
    echo "  3. Check logs if still failing:"
    echo "     docker logs musicbot-core"
    echo "     docker logs musicbot-web"
else
    echo ""
    echo "✓ All containers are healthy and ready to use!"
fi
