/**
 * Lidarr API response types
 * Covers artist/album lookup endpoints: /api/v1/artist/lookup, /api/v1/album/lookup
 */

/** Image returned by Lidarr for artists and albums */
export interface LidarrImage {
  url: string;
  coverType: 'poster' | 'banner' | 'fanart' | 'logo' | 'clearart' | 'disc' | 'cover' | 'screenshot' | 'headshot' | string;
  extension: string;
}

/** Artist result from /api/v1/artist/lookup */
export interface LidarrArtist {
  foreignArtistId: string;
  artistName: string;
  overview: string;
  images: LidarrImage[];
  status: string;
  artistType: string;
  disambiguation: string;
  genres: string[];
  cleanName: string;
  sortName: string;
  tadbId: number;
  discogsId: number;
  /** Only present if artist is already in Lidarr library */
  id?: number;
  monitored?: boolean;
  qualityProfileId?: number;
  metadataProfileId?: number;
  rootFolderPath?: string;
}

/** Album result from /api/v1/album/lookup */
export interface LidarrAlbum {
  foreignAlbumId: string;
  title: string;
  overview: string;
  releaseDate: string;
  images: LidarrImage[];
  genres: string[];
  albumType: string;
  artistId: number;
  /** Nested artist info from lookup */
  artist?: {
    foreignArtistId: string;
    artistName: string;
    images: LidarrImage[];
  };
  /** Only present if album is already in Lidarr library */
  id?: number;
  monitored?: boolean;
}

/** Lidarr client configuration */
export interface LidarrConfig {
  baseUrl: string;
  apiKey: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
}
