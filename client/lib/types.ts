export interface Analysis {
  overview: string;
  tldr: string;
  content_summary: string;
  key_points: string[];
  action_items: string[];
  topics: string[];
  tone: string;
  emotions: string[];
  behaviour_notes: string[];
  notable_quotes: string[];
  sentiment: string;
}

export interface ProcessResponse {
  session_id: string;
  title: string;
  kind: "audio" | "video" | "image" | "unknown";
  source_type: "upload" | "youtube" | "url" | "text";
  duration: number | null;
  language: string | null;
  transcript: string | null;
  diarization: unknown | null;
  image_info: unknown | null;
  analysis: Analysis;
}

export interface ChatTurn {
  question: string;
  answer: string;
}