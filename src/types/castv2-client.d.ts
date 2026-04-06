/**
 * Minimal type declarations for castv2-client.
 * No @types/castv2-client exists on npm — this provides basic types
 * for the Chromecast client library.
 */
declare module 'castv2-client' {
  import { EventEmitter } from 'events';

  export class Client extends EventEmitter {
    connect(host: string, callback: () => void): void;
    launch(app: typeof DefaultMediaReceiver, callback: (err: Error | null, player: DefaultMediaReceiver) => void): void;
    close(): void;
  }

  export class DefaultMediaReceiver extends EventEmitter {
    load(media: MediaInfo, options: LoadOptions, callback: (err: Error | null, status: PlayerStatus) => void): void;
    play(callback?: (err: Error | null, status: PlayerStatus) => void): void;
    pause(callback?: (err: Error | null, status: PlayerStatus) => void): void;
    stop(callback?: (err: Error | null, status: PlayerStatus) => void): void;
    seek(currentTime: number, callback?: (err: Error | null, status: PlayerStatus) => void): void;
    getStatus(callback: (err: Error | null, status: PlayerStatus) => void): void;
    on(event: 'status', listener: (status: PlayerStatus) => void): this;
  }

  export interface MediaInfo {
    contentId: string;
    contentType: string;
    streamType: 'BUFFERED' | 'LIVE' | 'NONE';
    metadata?: Record<string, unknown>;
  }

  export interface LoadOptions {
    autoplay?: boolean;
    currentTime?: number;
  }

  export interface PlayerStatus {
    currentTime: number;
    playerState: 'IDLE' | 'PLAYING' | 'PAUSED' | 'BUFFERING';
    media?: MediaInfo;
    volume?: { level: number; muted: boolean };
  }
}
