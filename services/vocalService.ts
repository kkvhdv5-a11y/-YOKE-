
import { generateEmotiveSpeech } from './aiOrchestrator';
import { AudioSettings } from '../types';

export interface VocalResponse {
  audioData?: string; 
  isLocal?: boolean;  
  nodeName: string;
}

const NODES = {
  PRIMARY: '神经主节点 (Gemini)',
  BACKUP: '本地镜像节点 (OS)'
};

export const orchestrateVocalSynthesis = async (
  text: string, 
  settings: AudioSettings,
  onNodeSwitch?: (nodeName: string) => void
): Promise<VocalResponse | null> => {
  // 1. 尝试物理神经节点 (Gemini TTS)
  try {
    if (onNodeSwitch) onNodeSwitch(NODES.PRIMARY);
    const neuralAudio = await generateEmotiveSpeech(text, settings.voiceName);
    return { audioData: neuralAudio, nodeName: NODES.PRIMARY };
  } catch (e) {
    console.error("物理语音节点异常，切换镜像...");
  }

  // 2. 本地保底：绝对不会挂掉的本地合成
  if (onNodeSwitch) onNodeSwitch(NODES.BACKUP);
  return { isLocal: true, nodeName: NODES.BACKUP };
};

export const speakLocally = (text: string, settings: AudioSettings, onEnd: () => void) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); 
  const cleanText = text.replace(/\[.*?\]/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Xiaoxiao') || v.name.includes('Google'))) || voices.find(v => v.lang.includes('zh'));
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.pitch = settings.pitch; utterance.rate = settings.rate; utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
};
