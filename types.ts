
export type MessageRole = 'user' | 'assistant' | 'system';

export interface AudioSettings {
  voiceName: string; 
  pitch: number;    
  rate: number;     
  localVoiceURI?: string; 
}

export interface MessageSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  sources?: MessageSource[];
  // 缓存解码后的音频片段
  cachedAudioChunks?: AudioBuffer[];
}

export interface AIStatus {
  id: string;
  name: string;
  status: 'online' | 'processing' | 'idle';
  load: number;
}
