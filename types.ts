export interface CsvRow {
  [key: string]: string;
}

export interface ProcessingStats {
  total: number;
  processed: number;
  isProcessing: boolean;
  isComplete: boolean;
}

export interface FileState {
  file: File | null;
  name: string;
  isValid: boolean;
}

export interface PreviewData {
  csvHeaders: string[];
  templateKeys: string[];
  rowCount: number;
}

export type ColumnMapping = Record<string, string | null>;