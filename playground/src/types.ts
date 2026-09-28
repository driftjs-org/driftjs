export type OutputTabId = 'preview' | 'console';

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  text: string;
  timestamp: string;
}

export interface CompilationResult {
  success: boolean;
  module?: any;
  compileDurationMs: number;
  error?: {
    message: string;
    line?: number | undefined;
    column?: number | undefined;
  };
}

export interface PresetExample {
  id: string;
  name: string;
  icon?: string;
  description: string;
  code: string;
}
