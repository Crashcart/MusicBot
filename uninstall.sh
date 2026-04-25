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
read -p "Are you sure you want to permanently delete MusicBot and all data? (y/N) " -n 1 -r REPLY < /dev/tty
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    cd "$INSTALL_DIR" || exit 1

    echo ""
    echo "-> Stopping and removing Docker containers/volumes (including databases)..."
    if ! docker compose down -v; then
        echo "ERROR: Failed to stop Docker containers"
        exit 1
    fi
    echo "✓ Docker containers and volumes removed"

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
