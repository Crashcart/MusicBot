import {
  Client,
  REST,
  Routes,
  ChatInputCommandInteraction,
  Interaction,
} from 'discord.js';
import pino from 'pino';
import type { LidarrClient } from '../integrations/lidarr-client';
import { searchCommandData, handleSearchCommand } from './search';

const logger = pino({
  transport: { target: 'pino-pretty' },
  name: 'cmd-handler',
});

/**
 * Register all slash commands with the Discord API.
 * Call once after the client is ready.
 */
export async function registerCommands(client: Client): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = client.user?.id;

  if (!token || !clientId) {
    logger.error('Cannot register commands — missing token or client user');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const commands = [searchCommandData.toJSON()];

  try {
    logger.info({ count: commands.length }, 'Registering slash commands with Discord');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info('Slash commands registered successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to register slash commands');
  }
}

/**
 * Set up the interactionCreate event handler.
 * Routes incoming command interactions to the correct handler.
 */
export function setupCommandListener(client: Client, lidarr: LidarrClient | null): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    // Only handle chat input (slash) commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction as ChatInputCommandInteraction;

    try {
      switch (command.commandName) {
        case 'search':
          await handleSearchCommand(command, lidarr);
          break;

        default:
          logger.warn({ command: command.commandName }, 'Unknown command received');
          await command.reply({
            content: 'Unknown command.',
            ephemeral: true,
          });
      }
    } catch (error) {
      logger.error({ err: error, command: command.commandName }, 'Unhandled error in command handler');

      // Try to reply if we haven't yet
      const replyFn = command.replied || command.deferred
        ? command.editReply.bind(command)
        : command.reply.bind(command);

      try {
        await replyFn({ content: '❌ An unexpected error occurred.' });
      } catch {
        // If replying also fails, just log — nothing more we can do
        logger.error('Failed to send error reply to user');
      }
    }
  });

  logger.info('Command interaction listener registered');
}
