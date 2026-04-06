#!/bin/bash

echo "======================================"
echo "    MusicBot Uninstallation Script    "
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

read -p "Are you sure you want to permanently delete MusicBot and all data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    cd $INSTALL_DIR
    
    echo "-> Stopping and removing Docker containers/volumes (including databases)..."
    docker compose down -v
    
    cd /opt
    echo "-> Deleting repository directory..."
    rm -rf $INSTALL_DIR
    
    echo "======================================"
    echo "        Uninstallation Complete       "
    echo "======================================"
else
    echo "Uninstallation aborted."
fi
