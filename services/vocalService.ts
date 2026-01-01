
import { generateEmotiveSpeech } from './aiOrchestrator';
import { AudioSettings } from '../types';
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';

export interface VocalResponse {
  audioChunks?: AudioBuffer[]; 
  isLocal?: boolean;  
  nodeName: string;
}

const NODES = {
  PRIMARY: '神经主节点 (Gemini 2.5)',
  BACKUP: '本地镜像节点 (OS Engine)'
};

// 语义化精准切分：避免在词语中间断开
const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
  const cleanText = text.replace(/\[.*?\]/g, '').replace(/[\r\n]/g, ' ').trim();
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
    if (onNodeSwitch) onNodeSwitch(NODES.PRIMARY);
    
    const signalMatch = text.match(/\[神经重构信号\]:?([\s\S]*?)$/i);
    const rawContent = signalMatch ? signalMatch[1].trim() : text.replace(/\[.*?\]/g, '').trim();
    
    // 调小单次生成块大小（350字），降低 Resource Exhausted 触发概率
    const textChunks = splitTextIntoChunks(rawContent, 350);
    const audioBuffers: AudioBuffer[] = [];

    for (let i = 0; i < textChunks.length; i++) {
      try {
        const data = await generateEmotiveSpeech(textChunks[i], settings.voiceName || 'Charon');
        if (data) {
          const buffer = await decodeAudioData(decodeBase64(data), audioCtx);
          audioBuffers.push(buffer);
        }
      } catch (innerError: any) {
        // 如果触发 Quota 限制 (429)，立即跳出循环，交由本地引擎保底
        if (innerError.message?.includes('429') || innerError.message?.includes('Resource exhausted')) {
          console.warn("[熔断系统] 云端 TTS 资源耗尽，正在紧急切换至本地引擎...");
          throw new Error('QUOTA_EXHAUSTED');
        }
        throw innerError;
      }
      onProgress(Math.round(((i + 1) / textChunks.length) * 100));
    }

    if (audioBuffers.length === 0) throw new Error("Audio synthesis returned empty");

    return { audioChunks: audioBuffers, nodeName: NODES.PRIMARY };
  } catch (e: any) {
    console.warn("TTS主节点故障/熔断:", e.message);
  }

  // 本地冗余节点
  if (onNodeSwitch) onNodeSwitch(NODES.BACKUP);
  return { isLocal: true, nodeName: NODES.BACKUP };
};

const UTTERANCE_POOL = new Set<SpeechSynthesisUtterance>();

export const speakLocally = (text: string, settings: AudioSettings, onEnd: () => void) => {
  if (!('speechSynthesis' in window)) {
    onEnd();
    return;
  }
  
  window.speechSynthesis.cancel(); 
  UTTERANCE_POOL.clear();

  const signalMatch = text.match(/\[神经重构信号\]:?([\s\S]*?)$/i);
  const rawContent = signalMatch ? signalMatch[1].trim() : text.replace(/\[.*?\]/g, '').trim();
  const chunks = splitTextIntoChunks(rawContent, 80); // 本地引擎分段更细，防止长句崩溃

  let currentChunkIndex = 0;

  const playNextChunk = () => {
    if (currentChunkIndex >= chunks.length) {
      UTTERANCE_POOL.clear();
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex]);
    UTTERANCE_POOL.add(utterance);

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Xiaoxiao') || v.name.includes('Google'))) || 
                          voices.find(v => v.lang.includes('zh')) ||
                          voices[0];
                          
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = settings.pitch || 1.0; 
    utterance.rate = settings.rate || 1.1;

    utterance.onend = () => {
      UTTERANCE_POOL.delete(utterance);
      currentChunkIndex++;
      playNextChunk();
    };

    utterance.onerror = (e) => {
      console.error("Local TTS Error:", e);
      UTTERANCE_POOL.delete(utterance);
      currentChunkIndex++;
      playNextChunk();
    };

    window.speechSynthesis.speak(utterance);
    
    // Chrome 定时器保活：解决超过15秒自动切断的问题
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAlive);
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);
  };

  playNextChunk();
};
