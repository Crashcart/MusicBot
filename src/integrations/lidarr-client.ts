import axios, { AxiosInstance } from 'axios';
import pino from 'pino';
import type { LidarrArtist, LidarrAlbum, LidarrConfig } from '../types/lidarr';

const logger = pino({
  transport: { target: 'pino-pretty' },
  name: 'lidarr-client',
});

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESULTS = 20;

/**
 * Lidarr API client for artist and album search/lookup.
 *
 * Uses the v1 lookup endpoints which search external metadata providers
 * (MusicBrainz/SkyHook), not just the local Lidarr library.
 */
export class LidarrClient {
  private readonly http: AxiosInstance;

  constructor(private readonly config: LidarrConfig) {
    if (!config.baseUrl) {
      throw new Error('LidarrClient: baseUrl is required');
    }
    if (!config.apiKey) {
      throw new Error('LidarrClient: apiKey is required');
    }

    // Normalise base URL — strip trailing slash
    const baseURL = config.baseUrl.replace(/\/+$/, '');

    this.http = axios.create({
      baseURL,
      timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      headers: {
        'X-Api-Key': config.apiKey,
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Search for artists by name.
   * Hits Lidarr's external lookup (MusicBrainz), not limited to your library.
   */
  async searchArtist(term: string): Promise<LidarrArtist[]> {
    const sanitised = this.sanitiseTerm(term);
    if (!sanitised) {
      logger.warn('searchArtist called with empty term');
      return [];
    }

    try {
      logger.info({ term: sanitised }, 'Searching Lidarr for artist');
      const response = await this.http.get<LidarrArtist[]>('/api/v1/artist/lookup', {
        params: { term: sanitised },
      });
      const results = response.data.slice(0, MAX_RESULTS);
      logger.info({ count: results.length }, 'Artist search returned results');
      return results;
    } catch (error) {
      logger.error({ err: error, term: sanitised }, 'Lidarr artist search failed');
      throw new LidarrApiError('Failed to search artists', error);
    }
  }

  /**
   * Search for albums by name.
   * Hits Lidarr's external lookup (MusicBrainz), not limited to your library.
   */
  async searchAlbum(term: string): Promise<LidarrAlbum[]> {
    const sanitised = this.sanitiseTerm(term);
    if (!sanitised) {
      logger.warn('searchAlbum called with empty term');
      return [];
    }

    try {
      logger.info({ term: sanitised }, 'Searching Lidarr for album');
      const response = await this.http.get<LidarrAlbum[]>('/api/v1/album/lookup', {
        params: { term: sanitised },
      });
      const results = response.data.slice(0, MAX_RESULTS);
      logger.info({ count: results.length }, 'Album search returned results');
      return results;
    } catch (error) {
      logger.error({ err: error, term: sanitised }, 'Lidarr album search failed');
      throw new LidarrApiError('Failed to search albums', error);
    }
  }

  /**
   * Sanitise and validate search term.
   * Strips excess whitespace and control characters.
   */
  private sanitiseTerm(term: string): string {
    // Remove control characters and collapse whitespace
    return term
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }
}

/** Custom error for Lidarr API failures — avoids leaking internals */
export class LidarrApiError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'LidarrApiError';
    this.cause = cause;
  }
}

/**
 * Create a LidarrClient from environment variables.
 * Returns null if LIDARR_URL or LIDARR_API_KEY are not set.
 */
export function createLidarrClient(): LidarrClient | null {
  const baseUrl = process.env.LIDARR_URL;
  const apiKey = process.env.LIDARR_API_KEY;

  if (!baseUrl || !apiKey) {
    logger.warn('LIDARR_URL or LIDARR_API_KEY not set — Lidarr integration disabled');
    return null;
  }

  return new LidarrClient({ baseUrl, apiKey });
}
