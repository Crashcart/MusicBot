#!/bin/bash

echo "======================================"
echo "    MusicBot Uninstallation Script    "
echo "======================================"
echo "Starting uninstallation at: $(date)"

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: Please run this script as root."
  exit 1
fi

INSTALL_DIR="/opt/musicbot"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "ERROR: MusicBot is not installed at $INSTALL_DIR."
    exit 1
fi

echo ""
echo "⚠ WARNING: This will PERMANENTLY DELETE MusicBot and all associated data."
echo ""
echo "Items that will be removed:"
echo "  • Docker containers: musicbot-core, musicbot-web, musicbot-ollama (if present)"
echo "  • Docker volumes (including the SQLite database)"
echo "  • $INSTALL_DIR/data/config.json (saved tokens and settings)"
echo "  • $INSTALL_DIR/data/logs/ (all log files)"
echo "  • $INSTALL_DIR (cloned repo and .env)"
echo ""
read -p "Are you sure you want to permanently delete MusicBot and all data? (y/N) " -n 1 -r REPLY < /dev/tty
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    cd "$INSTALL_DIR" || exit 1

    echo ""
    echo "-> Stopping and removing Docker containers/volumes (including databases)..."
    # --remove-orphans catches the optional ollama container started under a profile.
    if ! docker compose --profile ai-enabled down -v --remove-orphans 2>/dev/null; then
        # Fall back without the profile flag for older compose versions.
        docker compose down -v --remove-orphans || {
            echo "ERROR: Failed to stop Docker containers"
            exit 1
        }
    fi
    echo "✓ Docker containers and volumes removed"

    # Explicitly clear data/ before deleting the install dir so failures here
    # surface clearly rather than being masked by the rm -rf below.
    if [ -d "$INSTALL_DIR/data" ]; then
        echo ""
        echo "-> Removing persistent data directory..."
        rm -rf "$INSTALL_DIR/data" || {
            echo "ERROR: Failed to remove $INSTALL_DIR/data"
            exit 1
        }
        echo "✓ Persistent data removed (config.json, logs/, sqlite)"
    fi

    cd /opt || exit 1
    echo ""
    echo "-> Deleting repository directory..."
    if ! rm -rf "$INSTALL_DIR"; then
        echo "ERROR: Failed to delete directory $INSTALL_DIR"
        exit 1
    fi
    echo "✓ Repository directory deleted"

    echo ""
    echo "======================================"
    echo "      Uninstallation Complete"
    echo "======================================"
else
    echo "ℹ Uninstallation aborted."
fi
