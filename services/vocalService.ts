
import { generateEmotiveSpeech } from './aiOrchestrator';
import { AudioSettings } from '../types';
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';

export interface VocalResponse {
  audioChunks?: AudioBuffer[]; 
  isLocal?: boolean;  
  nodeName: string;
}

// Simple in-memory cache for audio buffers to prevent redundant API calls
const audioCache = new Map<string, AudioBuffer>();

// Generate a cache key based on text and voice settings
const getCacheKey = (text: string, voice: string): string => `${voice}:${text.trim()}`;

// 彻底清除 Markdown 符号
const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/\[.*?\]/g, '') // 移除 [标签]
    .replace(/[#*`_~>]/g, '') // 移除 #, *, `, _, ~, >
    .replace(/\n+/g, ' ') // 换行转空格
    .trim();
};

const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
  const cleanText = cleanTextForSpeech(text);
  const segments = cleanText.split(/([。！？；.!?;\n])/g);
  let chunks: string[] = [];
  let currentChunk = "";
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if ((currentChunk + segment).length > maxLength) {
      if (currentChunk.trim()) chunks.push(currentChunk);
      currentChunk = segment;
    } else {
      currentChunk += segment;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [cleanText];
};

export const orchestrateVocalSynthesis = async (
  text: string, 
  settings: AudioSettings,
  audioCtx: AudioContext,
  onProgress: (percent: number) => void,
  onNodeSwitch?: (nodeName: string) => void
): Promise<VocalResponse | null> => {
  
  try {
    const signalMatch = text.match(/\[神经重构信号\]:?([\s\S]*?)$/i);
    const rawContent = signalMatch ? signalMatch[1].trim() : text;
    
    // Split text into manageable chunks for TTS API
    const textChunks = splitTextIntoChunks(rawContent, 400);
    const audioBuffers: AudioBuffer[] = [];

    if (onNodeSwitch) onNodeSwitch('云端神经节点 (Gemini-TTS)');

    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      const cacheKey = getCacheKey(chunkText, settings.voiceName);

      // 1. Check Cache First
      if (audioCache.has(cacheKey)) {
        audioBuffers.push(audioCache.get(cacheKey)!);
        onProgress(Math.round(((i + 1) / textChunks.length) * 100));
        continue;
      }

      // 2. Call Cloud API with Retry/Fallback logic
      try {
        const data = await generateEmotiveSpeech(chunkText, settings.voiceName);
        if (data) {
          const buffer = await decodeAudioData(decodeBase64(data), audioCtx);
          // Store in cache
          audioCache.set(cacheKey, buffer);
          audioBuffers.push(buffer);
        }
      } catch (innerError: any) {
        const errorMsg = innerError.message?.toLowerCase() || "";
        // 429 RESOURCE_EXHAUSTED or Quota detection
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exhausted') || errorMsg.includes('limit')) {
          console.warn("[熔断机制] 云端配额耗尽，切换至物理本地合成。");
          throw new Error('QUOTA_LIMIT');
        }
        throw innerError;
      }
      onProgress(Math.round(((i + 1) / textChunks.length) * 100));
    }

    return { audioChunks: audioBuffers, nodeName: '云端神经节点 (Gemini-TTS)' };
  } catch (e: any) {
    if (onNodeSwitch) onNodeSwitch('物理本地引擎 (Fallback)');
    return { isLocal: true, nodeName: '物理本地引擎 (Fallback)' };
  }
};

export const speakLocally = (text: string, settings: AudioSettings, onEnd: () => void) => {
  if (!('speechSynthesis' in window)) {
    onEnd();
    return;
  }
  
  window.speechSynthesis.cancel(); 
  const cleanContent = cleanTextForSpeech(text);
  const chunks = splitTextIntoChunks(cleanContent, 100);

  let currentChunkIndex = 0;
  const playNextChunk = () => {
    if (currentChunkIndex >= chunks.length) {
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex]);
    const voices = window.speechSynthesis.getVoices();
    
    // Priority: Chinese Professional Voices -> Local OS Voices
    const selectedVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Xiaoxiao') || v.name.includes('Mainland'))) || 
                          voices.find(v => v.lang.includes('zh')) ||
                          voices[0];
                          
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = settings.pitch; 
    utterance.rate = settings.rate;

    utterance.onend = () => {
      currentChunkIndex++;
      playNextChunk();
    };
    
    utterance.onerror = () => {
      currentChunkIndex++;
      playNextChunk();
    };

    window.speechSynthesis.speak(utterance);
  };

  playNextChunk();
};
