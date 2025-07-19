export interface HistoryEntry {
  type: 'user' | 'llm_response';
  content: string | Record<string, string> | null;
  timestamp: string;
}

export interface ProjectHistory {
  project_name: string;
  prompts: HistoryEntry[];
}

export interface LlmOptions {
  [provider: string]: string[];
}

export interface ProblemData {
  type: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ProjectInfo {
  project_id: string;
  name: string;
}