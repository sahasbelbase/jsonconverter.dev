
export type FlatJSON = Record<string, string | number | boolean | null>;

export interface ParsedData {
  headers: string[];
  rows: FlatJSON[];
  originalSize: number;
}

export enum ViewMode {
  INPUT = 'INPUT',
  PREVIEW = 'PREVIEW'
}

export enum ToolMode {
  CONVERTER = 'CONVERTER',
  DIFF = 'DIFF',
  FORMAT = 'FORMAT',
  HTML = 'HTML',
  XML = 'XML',
  MEDIA_PLAYER = 'MEDIA_PLAYER',
  TOKENIZER = 'TOKENIZER',
  JWT = 'JWT',
  URL_ENCODER = 'URL_ENCODER'
}

export type AlertType = 'success' | 'error' | 'info';

export interface AlertMessage {
  type: AlertType;
  message: string;
}

export interface JsonStats {
  size: string;
  keys: number;
  depth: number;
  arrays: number;
  objects: number;
}