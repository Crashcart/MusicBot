#!/bin/bash
set -e

echo "======================================"
echo "    MusicBot Installation Script      "
echo "======================================"

if [[ "$EUID" -ne 0 ]]; then 
  echo "Please run this script as root (sudo bash <(curl ...))"
  exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

INSTALL_DIR="/opt/musicbot"

if [ -d "$INSTALL_DIR" ]; then
    echo "Directory $INSTALL_DIR already exists. Use the upgrade script instead."
    exit 1
fi

echo "-> Cloning repository into $INSTALL_DIR..."
git clone https://github.com/Crashcart/MusicBot.git $INSTALL_DIR

cd $INSTALL_DIR

echo "-> Setting up environment variables..."
cp .env.example .env
echo "Notice: A default .env file has been created. Please update it with your Discord/Plex tokens later."

echo "-> Starting core Docker containers..."
# Spin up without the AI profile first for stability
docker compose up -d bot web

echo "======================================"
echo " Installation Complete! "
echo " Portal: http://localhost:3000 "
echo " Directory: $INSTALL_DIR"
echo "======================================"
