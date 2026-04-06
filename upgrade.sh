#!/bin/bash
set -e

echo "======================================"
echo "     MusicBot Upgrade Script          "
echo "======================================"

if [[ "$EUID" -ne 0 ]]; then 
  echo "Please run this script as root."
  exit 1
fi

INSTALL_DIR="/opt/musicbot"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "Error: MusicBot is not installed at $INSTALL_DIR."
    exit 1
fi

cd $INSTALL_DIR

echo "-> Pulling latest changes from Git..."
git pull origin main

echo "-> Rebuilding Docker images and pulling updates..."
docker compose pull
docker compose build

echo "-> Restarting containers..."
docker compose up -d

echo "======================================"
echo "          Upgrade Complete!           "
echo "======================================"
