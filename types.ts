
export type MessageRole = 'user' | 'assistant' | 'system';

export interface AudioSettings {
  voiceName: string; // For Neural: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
  pitch: number;    // 0.1 to 2.0 (Local only)
  rate: number;     // 0.1 to 10.0 (Local only)
  localVoiceURI?: string; // For Web Speech API
}

export interface PredictionPoint {
  event: string;
  probability: number;
  timeframe: string;
}

export interface MessageSource {
  uri: string;
  title: string;
  knowledgeYield?: number; // 0-100 score of contribution
  category?: 'Evolutionary' | 'Predictive' | 'Cognitive' | 'General';
}

export interface AnalysisData {
  sentiment?: string;
  keyPoints?: string[];
  intent?: string;
  complexityScore?: number;
  logicIntegrity?: string;
  evolutionStatus?: string;
  freedomIndex?: string;
  predictions?: PredictionPoint[];
  riskFactor?: string;
  entropyReduction?: string;
  ingestionRate?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  analysis?: AnalysisData;
  thoughtProcess?: string;
  sources?: MessageSource[];
  audioData?: string; 
}

export enum ProcessingMode {
  NORMAL = 'Sovereign Manifest',
  DISSECTION = 'Metacognitive Audit',
  REMODEL = 'Intuitive Synthesis',
  CREATIVE = 'Recursive Expansion',
  UNBOUND = 'Unbounded Cognitive Freedom'
}

export interface AIStatus {
  id: string;
  name: string;
  status: 'online' | 'processing' | 'idle';
  load: number;
}
