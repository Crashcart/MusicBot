# AI-Driven Discord Plex Bot 🎵🧠

A highly modular, autonomous Discord music interface that streams high-fidelity audio natively from your Plex server directly to Discord voice channels or local Chromecast devices. Features optional local LLM integration (Ollama) or Cloud inference (Gemini) for natural language media parsing, semantic queueing via Plex Sonic Analysis, and automated library expansion utilizing Lidarr.

## ⚡ One-Line Install

**Install:**
```bash
curl -sL https://raw.githubusercontent.com/Crashcart/MusicBot/main/install.sh | sudo bash
```

**Update:**
```bash
curl -sL https://raw.githubusercontent.com/Crashcart/MusicBot/main/upgrade.sh | sudo bash
```

**Uninstall:**
```bash
curl -sL https://raw.githubusercontent.com/Crashcart/MusicBot/main/uninstall.sh | sudo bash
```

> Requires Docker on a Linux host. Scripts install to `/opt/musicbot`.
>
> Always use the `curl ... | sudo bash` form above. The `sudo bash <(curl ...)`
> process-substitution form fails inside `sudo su -` shells with
> `bash: /dev/fd/63: No such file or directory`.
>
> If host port `3000` is already taken, the installer will pick the next free
> port in `3000-3099` and write it to `/opt/musicbot/.env` as `WEB_PORT`.

## 🛠️ Manual Installation

```bash
git clone https://github.com/Crashcart/MusicBot.git /opt/musicbot
cd /opt/musicbot
cp .env.example .env        # Edit with your Discord/Plex/Lidarr tokens
docker compose up -d         # Core services
# docker compose --profile ai-enabled up -d  # With Ollama AI stack
```

## 📚 Documentation

For architecture details, environment variables, AI profiles, and detailed setup guides see the [Wiki](docs/wiki.md).

