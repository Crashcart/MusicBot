import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { LOG_DIR } from '../../utils/logger';

export interface LogEntry {
  time?: number;
  level?: number;
  name?: string;
  msg?: string;
  err?: unknown;
  [key: string]: unknown;
}

const PINO_LEVELS: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

export function listAvailableLogs(): string[] {
  try {
    return fs.readdirSync(LOG_DIR)
      .filter((f) => f.endsWith('.log'))
      .map((f) => f.replace(/\.log$/, ''))
      .sort();
  } catch {
    return [];
  }
}

function logPath(service: string): string {
  // Block path traversal: no slashes, no relative segments.
  if (!/^[a-zA-Z0-9_-]+$/.test(service)) {
    throw new Error('Invalid service name');
  }
  return path.join(LOG_DIR, `${service}.log`);
}

export function readTail(service: string, lines: number): LogEntry[] {
  const file = logPath(service);
  if (!fs.existsSync(file)) return [];

  const content = fs.readFileSync(file, 'utf-8');
  const allLines = content.split('\n').filter(Boolean);
  const tail = allLines.slice(-Math.max(1, Math.min(lines, 5000)));

  return tail.map(parseLine).filter((e): e is LogEntry => e !== null);
}

function parseLine(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line) as LogEntry;
    if (typeof parsed.level === 'number') {
      (parsed as LogEntry & { levelName?: string }).levelName = PINO_LEVELS[parsed.level] ?? String(parsed.level);
    }
    return parsed;
  } catch {
    // Not JSON — wrap as a raw message so it still shows in the UI.
    return { msg: line, levelName: 'info' } as LogEntry;
  }
}

/**
 * Tail a log file and emit each new line via 'line' events.
 * Stops when stop() is called. Polls on a 1s interval — fine for a low-volume
 * admin UI, no need for inotify here.
 */
export function tailFile(service: string): { emitter: EventEmitter; stop: () => void } {
  const file = logPath(service);
  const emitter = new EventEmitter();
  let position = 0;
  let stopped = false;

  if (fs.existsSync(file)) {
    position = fs.statSync(file).size;
  }

  const interval = setInterval(() => {
    if (stopped) return;
    fs.stat(file, (err, stats) => {
      if (err || stopped) return;
      if (stats.size < position) {
        // File rotated/truncated — restart from the beginning.
        position = 0;
      }
      if (stats.size > position) {
        const stream = fs.createReadStream(file, { start: position, end: stats.size });
        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf-8');
        });
        stream.on('end', () => {
          const lines = buffer.split('\n').filter(Boolean);
          for (const line of lines) {
            const entry = parseLine(line);
            if (entry) emitter.emit('line', entry);
          }
          position = stats.size;
        });
        stream.on('error', () => {/* ignore — will retry next tick */});
      }
    });
  }, 1000);

  const stop = () => {
    stopped = true;
    clearInterval(interval);
    emitter.removeAllListeners();
  };

  return { emitter, stop };
}
