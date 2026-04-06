# MusicBot Wiki 📖

Welcome to the comprehensive documentation for the AI-Driven Discord Plex Bot.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [CLI / Bash Scripts](#cli--bash-scripts)
3. [Configuration & Environment Variables](#configuration)
4. [AI Capabilities (Ollama)](#ai-capabilities)

---

### Architecture Overview
This application operates on a "Cog" architecture via Docker Compose profiles. The core bot streams HLS audio directly from your Plex Media Server via the `@discordjs/voice` libraries, or targets a local Chromecast device using zero-conf `mDNS` networking. 

### CLI / Bash Scripts
We provide three primary scripts for Linux environments to rapidly deploy the bot. Ensure you are running these as `root` (or with `sudo`) and that Docker is installed prior to execution.

#### 1. Install
The installation script will clone the repository into `/opt/musicbot`, copy the default environment template, and launch the non-AI core containers.
```bash
sudo bash <(curl -sL https://raw.githubusercontent.com/USERNAME/MusicBot/main/install.sh)
```

#### 2. Upgrade
To pull the latest commits, rebuild the docker images, and restart the active containers without losing your SQLite database:
```bash
sudo bash <(curl -sL https://raw.githubusercontent.com/USERNAME/MusicBot/main/upgrade.sh)
```

#### 3. Uninstall
If you need to completely remove the bot, including all volumes and images:
```bash
sudo bash <(curl -sL https://raw.githubusercontent.com/USERNAME/MusicBot/main/uninstall.sh)
```

### Configuration
Your primary configuration is managed in the `.env` file generated during installation.
*   **DISCORD_TOKEN:** Your bot token from the Discord Developer Portal.
*   **PLEX_CLIENT_IDENTIFIER:** A unique string identifying your bot instance on your Plex Server.
*   **PORT:** The port the Fastify web server utilizes to process the Plex PIN OAuth flow.

To obtain your Plex Token, navigate to `http://<your-ip>:<PORT>` after launching the bot and follow the redirect to Plex.tv.

### AI Capabilities
To enable the LLM functionality, you must run Docker Compose utilizing profiles. This is not strictly supported by the 1-click install script to prevent overriding system resources with heavy local LLM processing.

To enable Ollama:
```bash
cd /opt/musicbot
docker compose down
docker compose --profile ai-enabled up -d
```
You can then hit the internal Ollama instance to pull models like `functiongemma:latest` for exact JSON-tooling compliance.
