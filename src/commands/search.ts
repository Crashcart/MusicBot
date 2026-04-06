import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import type { LidarrClient } from '../integrations/lidarr-client';
import type { LidarrArtist, LidarrAlbum } from '../types/lidarr';
import pino from 'pino';

const logger = pino({
  transport: { target: 'pino-pretty' },
  name: 'cmd-search',
});

/** Max results shown in a single Discord reply */
const DISPLAY_LIMIT = 5;

/** Max characters for overview/description in embed fields */
const OVERVIEW_MAX_LENGTH = 200;

/** Build the /search slash command definition */
export const searchCommandData = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search Lidarr for artists or albums')
  .addSubcommand((sub) =>
    sub
      .setName('artist')
      .setDescription('Search for an artist / band')
      .addStringOption((opt) =>
        opt
          .setName('name')
          .setDescription('Artist or band name to search for')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(200)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('album')
      .setDescription('Search for an album')
      .addStringOption((opt) =>
        opt
          .setName('name')
          .setDescription('Album name to search for')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(200)
      )
  );

/**
 * Handle /search interactions.
 * Routes to artist or album subcommand handler.
 */
export async function handleSearchCommand(
  interaction: ChatInputCommandInteraction,
  lidarr: LidarrClient | null
): Promise<void> {
  // Guard: Lidarr must be configured
  if (!lidarr) {
    await interaction.reply({
      content: '⚠️ Lidarr is not configured. Set `LIDARR_URL` and `LIDARR_API_KEY` in your environment.',
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'artist') {
    await handleArtistSearch(interaction, lidarr);
  } else if (subcommand === 'album') {
    await handleAlbumSearch(interaction, lidarr);
  }
}

// ──────────────────────────────────────────
// Artist search
// ──────────────────────────────────────────

async function handleArtistSearch(
  interaction: ChatInputCommandInteraction,
  lidarr: LidarrClient
): Promise<void> {
  const name = interaction.options.getString('name', true);

  // Defer — Lidarr lookup can take a few seconds
  await interaction.deferReply();

  try {
    const artists = await lidarr.searchArtist(name);

    if (artists.length === 0) {
      await interaction.editReply(`No artists found for **${name}**.`);
      return;
    }

    const embed = buildArtistEmbed(name, artists.slice(0, DISPLAY_LIMIT));
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error({ err: error, name }, 'Artist search command failed');
    await interaction.editReply('❌ Failed to search Lidarr. Is the service running?');
  }
}

function buildArtistEmbed(query: string, artists: LidarrArtist[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🎤 Artist results for "${query}"`)
    .setColor(0x1db954) // Spotify-green accent
    .setTimestamp();

  for (const artist of artists) {
    const overview = truncate(artist.overview, OVERVIEW_MAX_LENGTH);
    const genres = artist.genres?.length ? artist.genres.slice(0, 3).join(', ') : 'Unknown';
    const status = artist.id ? '✅ In library' : '➕ Not in library';

    const value = [
      overview || '_No description available._',
      `**Genres:** ${genres}`,
      `**Status:** ${status}`,
    ].join('\n');

    embed.addFields({
      name: artist.artistName + (artist.disambiguation ? ` (${artist.disambiguation})` : ''),
      value,
      inline: false,
    });
  }

  // Use first artist's poster as thumbnail if available
  const poster = findImage(artists[0]?.images, 'poster') ?? findImage(artists[0]?.images, 'cover');
  if (poster) {
    embed.setThumbnail(poster);
  }

  embed.setFooter({ text: `Showing top ${artists.length} result(s) from Lidarr` });

  return embed;
}

// ──────────────────────────────────────────
// Album search
// ──────────────────────────────────────────

async function handleAlbumSearch(
  interaction: ChatInputCommandInteraction,
  lidarr: LidarrClient
): Promise<void> {
  const name = interaction.options.getString('name', true);

  await interaction.deferReply();

  try {
    const albums = await lidarr.searchAlbum(name);

    if (albums.length === 0) {
      await interaction.editReply(`No albums found for **${name}**.`);
      return;
    }

    const embed = buildAlbumEmbed(name, albums.slice(0, DISPLAY_LIMIT));
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error({ err: error, name }, 'Album search command failed');
    await interaction.editReply('❌ Failed to search Lidarr. Is the service running?');
  }
}

function buildAlbumEmbed(query: string, albums: LidarrAlbum[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`💿 Album results for "${query}"`)
    .setColor(0x6c5ce7) // Purple accent
    .setTimestamp();

  for (const album of albums) {
    const artistName = album.artist?.artistName ?? 'Unknown Artist';
    const year = album.releaseDate ? new Date(album.releaseDate).getFullYear() : '?';
    const overview = truncate(album.overview, OVERVIEW_MAX_LENGTH);
    const status = album.id ? '✅ In library' : '➕ Not in library';
    const type = album.albumType ?? 'Album';

    const value = [
      `**Artist:** ${artistName}`,
      `**Year:** ${year} · **Type:** ${type}`,
      overview || '_No description available._',
      `**Status:** ${status}`,
    ].join('\n');

    embed.addFields({
      name: album.title,
      value,
      inline: false,
    });
  }

  // Use first album's cover as thumbnail if available
  const cover = findImage(albums[0]?.images, 'cover') ?? findImage(albums[0]?.images, 'disc');
  if (cover) {
    embed.setThumbnail(cover);
  }

  embed.setFooter({ text: `Showing top ${albums.length} result(s) from Lidarr` });

  return embed;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/** Truncate text to maxLen, appending "…" if clipped */
function truncate(text: string | undefined | null, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

/** Find the first image URL matching a given cover type */
function findImage(
  images: { url: string; coverType: string }[] | undefined,
  coverType: string
): string | null {
  if (!images) return null;
  const img = images.find((i) => i.coverType === coverType);
  return img?.url ?? null;
}
