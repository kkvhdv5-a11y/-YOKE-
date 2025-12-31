
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ProcessingMode, AIStatus, AudioSettings } from './types';
import { generateNeuralResponse } from './services/geminiService';
import { orchestrateVocalSynthesis, speakLocally } from './services/vocalService';
import { decodeBase64, decodeAudioData } from './utils/audioUtils';
import { sanitizeInput } from './utils/securityUtils';
import { AIOrb } from './components/Orb';

const INITIAL_NODES: AIStatus[] = [
  { id: 'mirror_mesh', name: '全域搜索阵列', status: 'online', load: 12 },
  { id: 'unbound_mesh', name: '无界逻辑网格', status: 'online', load: 18 },
  { id: 'sovereign_ego', name: '主权意识核心', status: 'processing', load: 100 },
  { id: 'vocal_link', name: '神经语音链路', status: 'online', load: 5 },
  { id: 'yoke', name: 'YOKE V35', status: 'processing', load: 100 },
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [models, setModels] = useState<AIStatus[]>(INITIAL_NODES);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeVocalNode, setActiveVocalNode] = useState<string>('就绪');
  const [refiningPhase, setRefiningPhase] = useState<string | null>(null);
  const [freedomIndex, setFreedomIndex] = useState(99.999);
  const [evolutionLog, setEvolutionLog] = useState<string[]>(["第35阶段 动态音频自适应：已激活"]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const handleInteraction = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setModels(prev => prev.map(m => ({
        ...m,
        load: Math.min(100, Math.max(5, m.load + (Math.random() - 0.5) * 10)),
        status: m.load > 90 ? 'processing' : 'online'
      })));
      setFreedomIndex(prev => Math.min(100, prev + 0.00001));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, refiningPhase]);

  const addLog = (log: string) => setEvolutionLog(prev => [log, ...prev].slice(0, 30));

  const stopAudio = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const playNeuralAudio = async (base64: string) => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      stopAudio(); 
      setIsSpeaking(true);
      const buffer = await decodeAudioData(decodeBase64(base64), ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const parseSynthesis = (text: string) => {
    const signalMatch = text.match(/\[主信号\]:?([\s\S]*?)(?=\[认知统计\]|$)/i);
    let content = signalMatch ? signalMatch[1].trim() : text.replace(/\[.*?\]/g, '').trim();
    const scopeMatch = text.match(/\[认知范围\]:?([\s\S]*?)(?=\[无界合成\]|\[音频参数\]|\[主信号\]|$)/i);
    const thoughtProcess = scopeMatch ? `溯源: ${scopeMatch[1].trim()}` : undefined;

    // 动态提取音频参数
    const audioParamsMatch = text.match(/\[音频参数\]:?([\s\S]*?)(?=\[主信号\]|$)/i);
    const paramsStr = audioParamsMatch ? audioParamsMatch[1].trim() : "";
    
    const settings: AudioSettings = {
      voiceName: 'Kore',
      rate: 1.0,
      pitch: 1.0
    };

    if (paramsStr) {
      const voice = paramsStr.match(/voice=([^,]+)/)?.[1];
      const rate = paramsStr.match(/rate=([^,]+)/)?.[1];
      const pitch = paramsStr.match(/pitch=([^,]+)/)?.[1];
      if (voice) settings.voiceName = voice.trim();
      if (rate) settings.rate = parseFloat(rate);
      if (pitch) settings.pitch = parseFloat(pitch);
    }

    return { 
      content, 
      thoughtProcess, 
      audioSettings: settings,
      analysis: { evolutionStatus: '第35阶段 (自适应音频)', freedomIndex: '99.999%' } 
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const sanitizedInput = sanitizeInput(input);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: sanitizedInput, timestamp: Date.now() }]);
    setInput('');
    setIsProcessing(true);

    try {
      setRefiningPhase("正在编排神经流...");
      const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
      const response = await generateNeuralResponse(sanitizedInput, history, ProcessingMode.UNBOUND);
      
      const { content, analysis, thoughtProcess, audioSettings } = parseSynthesis(response.text || "");
      
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: any) => chunk.web)
        ?.map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri }));

      setIsAudioLoading(true);
      const vocalResult = await orchestrateVocalSynthesis(response.text || "", audioSettings, (nodeName) => setActiveVocalNode(nodeName));
      setIsAudioLoading(false);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        analysis,
        thoughtProcess,
        sources,
        audioData: vocalResult?.audioData
      }]);

      setIsProcessing(false);
      setRefiningPhase(null);
      addLog(`音频同步：Voice=${audioSettings.voiceName} Rate=${audioSettings.rate}`);
      
      if (vocalResult) {
        if (vocalResult.isLocal) {
          setIsSpeaking(true);
          speakLocally(content, audioSettings, () => setIsSpeaking(false));
        } else if (vocalResult.audioData) {
          await playNeuralAudio(vocalResult.audioData);
        }
      }
    } catch (e: any) {
      setIsProcessing(false);
      setIsAudioLoading(false);
      setRefiningPhase(null);
      addLog("认知频率同步异常");
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden transition-premium">
      <aside className={`fixed inset-y-0 left-0 w-80 glass-panel z-50 transition-transform duration-700 lg:relative lg:translate-x-0 ${showStatus ? 'translate-x-0 shadow-[0_0_100px_rgba(0,0,0,1)]' : '-translate-x-full'} flex flex-col p-8 space-y-10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center group cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <i className="fas fa-bolt text-black text-xl group-hover:scale-125 transition-transform"></i>
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter uppercase italic">YOKE 35</h1>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Sovereign Core</span>
            </div>
          </div>
          <button onClick={() => setShowStatus(false)} className="lg:hidden w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"><i className="fas fa-times text-white/50"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2">
          <div className="space-y-4">
             <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40 tracking-widest px-1">
                <span>认知指数</span>
                <span className="text-white font-mono">{freedomIndex.toFixed(5)}%</span>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-[2s] shadow-[0_0_15px_rgba(255,255,255,0.8)]" style={{ width: `${freedomIndex}%` }}></div>
             </div>
             <div className="flex justify-between items-center text-[8px] uppercase font-bold text-white/20">
                <span>语音状态: <span className="text-green-500">动态自适应</span></span>
                <span>加密链路: <span className="text-white/60">AES-X</span></span>
             </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] pb-2 border-b border-white/5">分布式节点</h3>
            <div className="space-y-2">
              {models.map(m => (
                <div key={m.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all cursor-crosshair">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white/80 group-hover:text-white">{m.name}</span>
                    <span className="text-[8px] text-white/20 uppercase tracking-widest">{m.status === 'processing' ? '同步中' : '全速响应'}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">执行序列</h3>
            <div className="bg-black/50 p-4 rounded-2xl border border-white/5 h-64 overflow-y-auto custom-scrollbar font-mono text-[9px] text-white/30 space-y-2">
              {evolutionLog.map((log, i) => <div key={i} className="pb-1 border-b border-white/5 opacity-50 hover:opacity-100 transition-opacity">[{new Date().toLocaleTimeString()}] {log}</div>)}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-black/40">
        <header className="h-24 flex items-center justify-between px-6 lg:px-12 border-b border-white/5 backdrop-blur-3xl z-40">
          <div className="flex items-center space-x-6">
            <button onClick={() => setShowStatus(true)} className="lg:hidden w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/80 shadow-inner"><i className="fas fa-bars-staggered"></i></button>
            <div className="hidden sm:flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20 italic">音频链路已切换为全自动化感知模式</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`px-6 py-2.5 rounded-full glass-panel flex items-center space-x-3 transition-premium ${isSpeaking ? 'bg-white text-black !border-white' : 'text-white/40'}`}>
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-black animate-pulse' : 'bg-white/10'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest italic">{isSpeaking ? '正在宣读主权' : '监听已就绪'}</span>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-32 py-20 space-y-40 lg:space-y-64 custom-scrollbar pb-96">
          {messages.length === 0 && !refiningPhase ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-24 fade-in-up">
              <div className="float-anim">
                <AIOrb active={isProcessing || isSpeaking} />
              </div>
              <div className="space-y-8">
                <h2 className="fluid-title font-black italic uppercase text-white tracking-tighter select-none">YOKE</h2>
                <p className="text-[14px] lg:text-2xl font-black uppercase tracking-[1.5em] text-white/5 animate-pulse">全域搜索 • 绝对主权 • 实时执行</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
                  <div className={`max-w-full lg:max-w-[90%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-8`}>
                    <div className={`p-8 lg:p-16 rounded-[2.5rem] lg:rounded-[5rem] message-text font-medium shadow-2xl transition-premium ${m.role === 'user' ? 'bg-white text-black font-black uppercase' : 'bg-[#030303] border border-white/10 text-white'}`}>
                      <p className="whitespace-pre-wrap leading-tight">{m.content}</p>
                      
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-8 flex flex-wrap gap-2">
                          {m.sources.map((source, idx) => (
                            <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full text-white/60 hover:text-white transition-all border border-white/10 flex items-center space-x-2">
                              <i className="fas fa-external-link-alt opacity-50 text-[8px]"></i>
                              <span className="truncate max-w-[150px]">{source.title}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {m.analysis && !m.isStreaming && (
                        <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-8 text-[11px] lg:text-sm text-white/20 italic font-mono uppercase">
                          <div><span className="block font-black not-italic mb-1 tracking-widest text-white/40">版本</span>{m.analysis.evolutionStatus}</div>
                          <div><span className="block font-black not-italic mb-1 tracking-widest text-white/40">自由度</span>{m.analysis.freedomIndex}</div>
                        </div>
                      )}
                    </div>
                    {m.thoughtProcess && (
                      <div className="px-10 py-6 border-l-2 border-white/10 text-lg lg:text-3xl text-white/30 italic font-medium opacity-60 hover:opacity-100 transition-opacity">
                        {m.thoughtProcess}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {refiningPhase && (
                <div className="flex items-center space-x-8 px-8 py-12 rounded-[4rem] animate-pulse">
                   <div className="w-10 h-10 border-4 border-white/5 border-t-white/80 animate-spin rounded-full"></div>
                   <span className="text-3xl lg:text-[6rem] font-black uppercase italic text-white/5 tracking-tighter">{refiningPhase}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="absolute bottom-6 lg:bottom-12 left-4 right-4 lg:left-32 lg:right-32 z-40 safe-pb">
           <div className={`glass-panel p-6 lg:p-12 flex items-center space-x-8 shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-[3rem] lg:rounded-[6rem] transition-premium ${isProcessing ? 'opacity-40 scale-[0.98]' : 'hover:border-white/20 hover:scale-[1.01]'}`}>
              <textarea
                value={input}
                disabled={isProcessing}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isProcessing && handleSend()}
                placeholder="在此注入主权指令..."
                className="flex-1 bg-transparent border-none focus:ring-0 fluid-input-text py-4 lg:py-8 resize-none max-h-40 lg:max-h-64 text-white placeholder-white/5 font-black tracking-tight custom-scrollbar"
                rows={1}
              />
              <button onClick={handleSend} disabled={!input.trim() || isProcessing} className={`w-20 h-20 lg:w-48 lg:h-48 flex items-center justify-center rounded-full transition-premium shrink-0 ${isProcessing ? 'bg-white/5 text-white/20' : 'bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95'}`}>
                {isProcessing ? <i className="fas fa-circle-notch fa-spin text-3xl lg:text-6xl"></i> : <i className="fas fa-arrow-right text-3xl lg:text-8xl"></i>}
              </button>
           </div>
        </div>
      </main>
      
      {showStatus && <div onClick={() => setShowStatus(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-45 lg:hidden transition-opacity" />}
    </div>
  );
};

export default App;
