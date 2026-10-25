/**
 * Parsing, stats and flattening, off the main thread.
 *
 * These are all O(document) walks. Run inline they froze the tab: a 100 KB
 * paste blocked rendering for 2 seconds, and anything multi-megabyte was
 * effectively a hang.
 */
import { getJsonStats, parseAndFlattenJSON } from '../utils/jsonUtils';
import type { JsonStats, ParsedData } from '../types';

export type WorkerRequest =
  | { id: number; kind: 'validate'; text: string }
  | { id: number; kind: 'flatten'; text: string };

export type WorkerResponse =
  | { id: number; ok: true; kind: 'validate'; stats: JsonStats; parsed: unknown }
  | { id: number; ok: true; kind: 'flatten'; data: ParsedData }
  | { id: number; ok: false; message: string; position: number | null };

/** Pulls the character offset out of whichever wording this engine uses. */
const errorPosition = (message: string): number | null => {
  const match = message.match(/position (\d+)/);
  return match ? Number(match[1]) : null;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.kind === 'validate') {
      const parsed = JSON.parse(request.text);
      const response: WorkerResponse = {
        id: request.id,
        ok: true,
        kind: 'validate',
        stats: getJsonStats(parsed),
        parsed,
      };
      self.postMessage(response);
      return;
    }

    const response: WorkerResponse = {
      id: request.id,
      ok: true,
      kind: 'flatten',
      data: parseAndFlattenJSON(request.text),
    };
    self.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response: WorkerResponse = {
      id: request.id,
      ok: false,
      message,
      position: errorPosition(message),
    };
    self.postMessage(response);
  }
};
