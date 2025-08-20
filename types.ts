
export interface FormData {
  role: string;
  eventName: string;
  organizer: string;
  context: string;
  message: string;
  audience: string;
  keyPoints: string;
  style: string;
  length: string;
  language: string;
}

export interface SpeechItem {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}
