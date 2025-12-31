
export type MessageRole = 'user' | 'assistant' | 'system';

export interface AudioSettings {
  voiceName: string; // For Neural: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
  pitch: number;    // 0.1 to 2.0 (Local only)
  rate: number;     // 0.1 to 10.0 (Local only)
  localVoiceURI?: string; // For Web Speech API
}

export interface AnalysisData {
  sentiment?: string;
  keyPoints?: string[];
  intent?: string;
  complexityScore?: number;
  logicIntegrity?: string;
  harvestYield?: string;
  predatoryLearning?: string;
  evolutionStatus?: string;
  eqScore?: string;
  cognitiveDepth?: string;
  intuitionYield?: string;
  metaLevel?: string;
  freedomIndex?: string;
  strategyResolution?: string;
  truthDepth?: string;
  sentienceScore?: string;
  metacognitiveTrace?: string;
}

export interface DiagnosticReport {
  rootCause: string;
  vulnerabilityType: string;
  remediationPath: string;
  immunizationKey: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  analysis?: AnalysisData;
  thoughtProcess?: string;
  sources?: { uri: string; title: string }[];
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
