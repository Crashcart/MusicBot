# MusicBot Debugging Guide

This guide helps troubleshoot common issues with MusicBot installation and runtime.

## Installation Issues

### Port Already In Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Diagnosis:**
```bash
# Check what process is using port 3000
sudo lsof -iTCP:3000 -sTCP:LISTEN

# Or check the range 3000-3100
sudo lsof -iTCP:3000-3100 -sTCP:LISTEN
```

**Solutions:**
1. Choose a different port by editing `.env`:
   ```
   WEB_PORT=3001
   ```
   Then restart: `docker compose up -d web`

2. Kill the conflicting process:
   ```bash
   sudo kill -9 <PID>
   ```

3. Re-run the installer — it auto-detects the next free port in 3000-3099
   and writes the chosen value to `.env`:
   ```bash
   sudo /opt/musicbot/install.sh
   ```

### Permission Denied on Port

**Error:** `EACCES: permission denied :::3000` (for ports < 1024)

**Solution:** Only use ports >= 1024 or run as root. Edit `.env`:
```
WEB_PORT=3000  # Change to >= 1024
```

### Docker Not Found

**Error:** `docker: command not found`

**Solution:** Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Git Not Found

**Error:** `git: command not found`

**Solution:** Install Git:
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y git

# CentOS/RHEL
sudo yum install -y git

# macOS
brew install git
```

## Container Issues

### Container Not Running After Installation

**Check container status:**
```bash
docker ps -a | grep musicbot
```

**View container logs:**
```bash
# Core bot logs
docker logs -f musicbot-core

# Web portal logs
docker logs -f musicbot-web

# Last 50 lines
docker logs --tail=50 musicbot-core
```

### Bot Won't Connect to Discord

**Error pattern in logs:** `Failed to login to Discord` with error code

**Check:**
1. `DISCORD_TOKEN` is valid:
   ```bash
   grep DISCORD_TOKEN /opt/musicbot/.env
   # Should NOT be: your_discord_bot_token
   ```

2. Bot token has right intents enabled in Discord Developer Portal:
   - Server Members Intent
   - Message Content Intent
   - Guild Messages

3. Create a fresh token if expired:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Copy the token and update `.env`
   - Restart: `docker compose restart musicbot-core`

### Web Portal Not Accessible

**Check if web container is running:**
```bash
docker ps | grep musicbot-web
```

**Check port binding:**
```bash
# What port is the web service listening on?
docker port musicbot-web

# Should show: 3000/tcp -> 0.0.0.0:WEB_PORT
```

**Try accessing directly:**
```bash
curl -v http://localhost:3000/

# From another machine:
curl -v http://<server-ip>:3000/
```

## Runtime Issues

### High Memory Usage

**Check container memory:**
```bash
docker stats musicbot-core musicbot-web
```

**Limit memory in docker-compose.yml:**
```yaml
services:
  bot:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

Then restart: `docker compose up -d`

### Log Files Growing Large

**Check log sizes:**
```bash
docker exec musicbot-core ls -lah /app/data/
docker exec musicbot-web ls -lah /app/data/
```

**Clear old logs (inside container):**
```bash
docker exec musicbot-core rm -f /app/data/musicbot-*.log.*
```

**Configure log rotation in .env:**
```
LOG_LEVEL=info
```

## API Integration Issues

### Plex Authentication Fails

**Error:** `Failed to request Plex PIN`

**Check network connectivity:**
```bash
docker exec musicbot-web curl -v https://plex.tv/api/v2/pins -H "X-Plex-Product: MusicBot"
```

**Common issues:**
1. Network firewall blocks `plex.tv`
2. Plex API timeout (> 10 seconds) — check internet speed
3. Client identifier conflict

**Workaround:** Increase timeout in `src/web/server.ts`:
```typescript
const PLEX_API_TIMEOUT_MS = 20_000;  // 20 seconds
```

### Lidarr Connection Fails

**Error:** `Failed to search artists` from Lidarr integration

**Check Lidarr is accessible:**
```bash
curl -v "http://lidarr-host:8686/api/v1/artist/lookup?term=test" \
  -H "X-Api-Key: YOUR_API_KEY"
```

**Verify .env settings:**
```bash
grep -E "LIDARR_" /opt/musicbot/.env
```

**Common issues:**
1. `LIDARR_URL` is unreachable (network, firewall)
2. `LIDARR_API_KEY` is wrong or expired
3. Lidarr is not running

## Collecting Debug Info

**Create a debug report for support:**
```bash
echo "=== System Info ===" > debug-report.txt
uname -a >> debug-report.txt

echo -e "\n=== Docker Version ===" >> debug-report.txt
docker --version >> debug-report.txt

echo -e "\n=== Docker Containers ===" >> debug-report.txt
docker ps -a >> debug-report.txt

echo -e "\n=== Environment ===" >> debug-report.txt
grep -v '^#' /opt/musicbot/.env | grep -E "(DISCORD|LIDARR|PORT)" >> debug-report.txt

echo -e "\n=== Core Bot Logs ===" >> debug-report.txt
docker logs --tail=100 musicbot-core >> debug-report.txt 2>&1

echo -e "\n=== Web Portal Logs ===" >> debug-report.txt
docker logs --tail=100 musicbot-web >> debug-report.txt 2>&1

echo "Debug report saved to debug-report.txt"
```

## Enabling Debug Logging

**Increase verbosity in .env:**
```
LOG_LEVEL=debug
```

Then restart containers:
```bash
docker compose restart
```

**Watch logs in real-time:**
```bash
docker logs -f musicbot-core
```

## Getting Help

When reporting issues, include:
1. Output from `docker compose logs -f`
2. Your OS and Docker version
3. Relevant lines from `.env` (redact tokens)
4. Steps to reproduce the issue
5. Error messages (full stack traces)

See the project README for support channels.
