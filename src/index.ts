import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import pino from 'pino';
import { startWebPortal } from './web/server';
import { createLidarrClient } from './integrations/lidarr-client';
import { registerCommands, setupCommandListener } from './commands/command-handler';

dotenv.config();

const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

// Initialise external service clients
const lidarrClient = createLidarrClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ]
});

client.once('ready', async () => {
  logger.info(`Discord Bot logged in as ${client.user?.tag}`);

  // Register slash commands with Discord API
  await registerCommands(client);
});

// Set up command interaction listener
setupCommandListener(client, lidarrClient);

// Start Web Portal
startWebPortal().then(() => {
  logger.info('Web Portal started successfully alongside bot.');
});

// Start Discord Bot
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (DISCORD_TOKEN && DISCORD_TOKEN !== 'your_discord_bot_token') {
  client.login(DISCORD_TOKEN).catch(err => {
    logger.error({ err }, 'Failed to login to Discord');
  });
} else {
  logger.warn('No valid DISCORD_TOKEN found in .env. Bot will not connect to Discord.');
}

