
import { generateEmotiveSpeech } from './geminiService';
import { AudioSettings } from '../types';

export interface VocalNode {
  id: string;
  name: string;
  type: 'neural' | 'local';
  priority: number;
}

const VOCAL_NODES: VocalNode[] = [
  { id: 'vocal_gemini_prime', name: '神经主节点 (Gemini)', type: 'neural', priority: 1 },
  { id: 'vocal_local_mirror', name: '本地镜像节点 (System)', type: 'local', priority: 2 },
];

export interface VocalResponse {
  audioData?: string; 
  isLocal?: boolean;  
  nodeName: string;
}

export const orchestrateVocalSynthesis = async (
  text: string, 
  settings: AudioSettings,
  onNodeSwitch?: (nodeName: string) => void
): Promise<VocalResponse | null> => {
  // 1. 尝试神经节点
  try {
    if (onNodeSwitch) onNodeSwitch(VOCAL_NODES[0].name);
    const neuralAudio = await generateEmotiveSpeech(text, settings.voiceName);
    return { audioData: neuralAudio, nodeName: VOCAL_NODES[0].name };
  } catch (e) {
    console.error("神经语音节点故障 (配额或网络错误)，切换至本地链路...", e);
  }

  // 2. 故障转移至本地节点
  try {
    if (onNodeSwitch) onNodeSwitch(VOCAL_NODES[1].name);
    return { isLocal: true, nodeName: VOCAL_NODES[1].name };
  } catch (e) {
    console.error("全语音链路崩溃。");
    return null;
  }
};

export const speakLocally = (text: string, settings: AudioSettings, onEnd: () => void) => {
  if (!('speechSynthesis' in window)) return;
  
  window.speechSynthesis.cancel(); 

  const cleanText = text
    .replace(/\[.*?\]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const voices = window.speechSynthesis.getVoices();
  
  if (settings.localVoiceURI) {
    const selectedVoice = voices.find(v => v.voiceURI === settings.localVoiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
  } else {
    const chineseVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Xiaoxiao') || v.name.includes('Yunxi') || v.name.includes('Mainland'))) || 
                         voices.find(v => v.lang.includes('zh'));
    if (chineseVoice) utterance.voice = chineseVoice;
  }
  
  utterance.pitch = settings.pitch; 
  utterance.rate = settings.rate;  
  utterance.onend = onEnd;
  utterance.onerror = (e) => {
    console.error("本地语音合成错误", e);
    onEnd();
  };

  window.speechSynthesis.speak(utterance);
};
