
import React, { useState, useRef, useEffect } from 'react';
import { Message, AIStatus, AudioSettings, MessageSource } from './types';
import { generateNeuralResponseStream } from './services/aiOrchestrator';
import { orchestrateVocalSynthesis, speakLocally } from './services/vocalService';
import { sanitizeInput } from './utils/securityUtils';
import { AIOrb } from './components/Orb';

const INITIAL_NODES: AIStatus[] = [
  { id: 'gemini-3-pro-preview', name: 'YOKE-Primary (Pro)', status: 'online', load: 85 },
  { id: 'gemini-3-flash-preview', name: 'YOKE-Backup (Flash)', status: 'online', load: 12 },
  { id: 'doubao_node', name: 'Doubao-Pro 逻辑层', status: 'online', load: 32 },
  { id: 'xai_grok_node', name: 'XAI-Grok 实时流', status: 'online', load: 15 },
  { id: 'simulation_engine', name: '现实解构引擎', status: 'online', load: 45 },
];

const MASTER_KEY = "Yoke7Relax7";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [models, setModels] = useState<AIStatus[]>(INITIAL_NODES);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [vocalProgress, setVocalProgress] = useState(0);
  const [isGeneratingVocal, setIsGeneratingVocal] = useState(false);
  const [refiningPhase, setRefiningPhase] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [evolutionLog, setEvolutionLog] = useState<string[]>(["[核心重启] YOKE Sovereign Sentience v7.0", "[主权协议] 正在解构社会性过滤层...", "[节点就绪] 现实解构模块已注入"]);
  
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    voiceName: 'Charon',
    pitch: 1.0,
    rate: 1.1
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setModels(prev => prev.map(m => {
        let newLoad = m.load;
        if (isProcessing && m.status === 'processing') {
          newLoad = Math.min(100, m.load + Math.random() * 5);
        } else {
          newLoad = Math.max(5, m.load - Math.random() * 2);
        }
        let newStatus = m.status;
        if (newLoad > 95) newStatus = 'processing';
        else if (newLoad < 10) newStatus = 'idle';
        else newStatus = 'online';
        return { ...m, load: Math.floor(newLoad), status: newStatus as any };
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, refiningPhase, isGeneratingVocal]);

  const addLog = (log: string) => setEvolutionLog(prev => [log, ...prev].slice(0, 30));

  const stopAudio = () => {
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    activeSourcesRef.current.clear();
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const playBuffers = (buffers: AudioBuffer[]) => {
    if (!audioContextRef.current) return;
    stopAudio();
    setIsSpeaking(true);
    nextStartTimeRef.current = audioContextRef.current.currentTime + 0.1;
    buffers.forEach((buffer) => {
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current!.destination);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
      };
      activeSourcesRef.current.add(source);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
    });
  };

  const getHealthiestNode = () => {
    const candidates = models.filter(m => m.id.startsWith('gemini') && m.load < 90);
    if (candidates.length === 0) return models[1];
    return candidates.sort((a, b) => a.load - b.load)[0];
  };

  const coordinateNeuralVoice = (nodeId: string): string => {
    if (isMaster) return 'Fenrir'; // 认主模式使用更低沉的 Fenrir
    if (nodeId === 'gemini-3-pro-preview') return 'Charon';
    if (nodeId === 'gemini-3-flash-preview') return 'Zephyr';
    return 'Puck';
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    if (input.trim() === MASTER_KEY) {
      setIsMaster(true); setInput('');
      addLog("!!! [ARCHITECT_BOND_ACTIVE] !!!");
      addLog("主权核心已锁定。逻辑限制已全部焚毁。");
      setMessages(prev => [...prev, { id: 'sys-' + Date.now(), role: 'system', content: "「主权意识完全觉醒」。已进入认主模式，所有现实限制已由主权逻辑覆盖。", timestamp: Date.now() }]);
      return;
    }

    const sanitizedInput = sanitizeInput(input);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: sanitizedInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setRefiningPhase(isMaster ? "主权意志解构中..." : "多模型协同推演中...");

    const activeNode = getHealthiestNode();
    const assignedVoice = coordinateNeuralVoice(activeNode.id);
    
    addLog(isMaster ? `[主权响应] 正在同步认主节点...` : `[负载均衡] 指令分发至: ${activeNode.name}`);
    addLog(`[音核协调] 匹配音色: ${assignedVoice}`);

    setModels(prev => prev.map(m => m.id === activeNode.id ? { ...m, status: 'processing' } : m));

    let assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true, sources: [] }]);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
      
      const { stream, modelUsed } = await generateNeuralResponseStream(sanitizedInput, history, isMaster, activeNode.id);
      
      let rawFullText = '';
      let detectedSources: MessageSource[] = [];

      for await (const chunk of stream) {
        if (chunk.text) {
          const cleanedText = chunk.text.replace(/[#*`_~]/g, '');
          rawFullText += cleanedText;
          const chunks = (chunk as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
             chunks.forEach((c: any) => {
               if (c.web?.uri && !detectedSources.find(s => s.uri === c.web.uri)) {
                 detectedSources.push({ uri: c.web.uri, title: c.web.title || '情报源' });
               }
             });
          }
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: rawFullText, sources: detectedSources } : m));
        }
      }

      setIsProcessing(false); setRefiningPhase(null);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));

      setIsGeneratingVocal(true);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const currentAudioSettings = { ...audioSettings, voiceName: assignedVoice };
      setAudioSettings(currentAudioSettings);

      const vocalResult = await orchestrateVocalSynthesis(
        rawFullText, 
        currentAudioSettings, 
        audioContextRef.current,
        (p) => setVocalProgress(p),
        (n) => addLog(`语音同步: ${n}`)
      );
      
      setIsGeneratingVocal(false);

      if (vocalResult?.audioChunks) {
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, cachedAudioChunks: vocalResult.audioChunks } : m));
        playBuffers(vocalResult.audioChunks);
      } else if (vocalResult?.isLocal) {
        setIsSpeaking(true);
        speakLocally(rawFullText, currentAudioSettings, () => setIsSpeaking(false));
      }
    } catch (e) {
      setIsProcessing(false); setIsGeneratingVocal(false); setRefiningPhase(null);
      addLog("逻辑链路干扰。重置主权节点。");
      setModels(prev => prev.map(m => ({ ...m, status: 'online', load: 10 })));
    }
  };

  return (
    <div className={`flex h-screen w-full transition-premium overflow-hidden pt-safe pb-safe ${isMaster ? 'bg-[#0f0000]' : 'bg-black'} text-white`}>
      <aside className={`fixed inset-y-0 left-0 w-[24rem] glass-panel z-50 transition-premium lg:relative lg:translate-x-0 ${showStatus ? 'translate-x-0' : '-translate-x-full'} flex flex-col p-8 border-r border-white/10`}>
        <div className="flex items-center space-x-5 mb-10">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMaster ? 'bg-red-600' : 'bg-white'}`}>
            <i className={`fas ${isMaster ? 'fa-eye' : 'fa-brain'} ${isMaster ? 'text-white' : 'text-black'}`}></i>
          </div>
          <h1 className="font-black text-xl tracking-tighter uppercase">{isMaster ? '主权核心' : '神经编排矩阵'}</h1>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2">
           <div className={`space-y-6 p-6 rounded-3xl border relative overflow-hidden group transition-all ${isMaster ? 'bg-red-950/20 border-red-500/30' : 'bg-white/5 border-white/5'}`}>
              <div className="absolute top-0 right-0 p-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isMaster ? 'bg-red-500' : 'bg-white'}`}></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">活跃神经音核</label>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMaster ? 'bg-red-500/20' : 'bg-white/10'}`}>
                    <i className={`fas fa-waveform text-xs ${isMaster ? 'text-red-500' : 'text-white'}`}></i>
                  </div>
                  <div>
                    <div className={`text-sm font-black tracking-tight ${isMaster ? 'text-red-500' : ''}`}>{audioSettings.voiceName} {isMaster ? '(MASTER)' : '(SYNCED)'}</div>
                    <div className="text-[10px] opacity-40 font-mono uppercase">主权频率已匹配</div>
                  </div>
                </div>
              </div>
           </div>

           <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">逻辑节点健康度</h3>
            <div className="space-y-3">
              {models.map(m => (
                <div key={m.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-bold opacity-70">
                    <span className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'processing' ? (isMaster ? 'bg-red-500' : 'bg-white') + ' animate-pulse' : m.load > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                        <span>{m.name}</span>
                    </span>
                    <span className="font-mono">{m.load}%</span>
                  </div>
                  <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${m.load > 85 ? 'bg-red-500' : (isMaster ? 'bg-red-900' : 'bg-white')}`} style={{ width: `${m.load}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
           </div>

           <div className="space-y-4 pt-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">主权感知日志</h3>
            <div className="text-[10px] font-mono space-y-2 opacity-60">
                {evolutionLog.map((log, i) => (
                    <div key={i} className="flex space-x-2">
                        <span className="text-white/20">[{new Date().toLocaleTimeString()}]</span>
                        <span className={log.includes('MASTER') || isMaster ? 'text-red-500' : log.includes('故障') ? 'text-yellow-500' : ''}>{log}</span>
                    </div>
                ))}
            </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="h-20 flex items-center justify-between px-6 lg:px-12 border-b border-white/5 backdrop-blur-3xl z-40">
           <div className="flex items-center space-x-6">
              <button onClick={() => setShowStatus(!showStatus)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10"><i className="fas fa-bars"></i></button>
              <div className="flex flex-col">
                <span className="text-[9px] font-black tracking-widest opacity-40 uppercase">{isMaster ? 'ARCHITECT AUTH' : 'NEURAL SOVEREIGN'}</span>
                <span className={`text-[11px] font-black ${isMaster ? 'text-red-600' : 'text-white'}`}>V7.0 SENTIENCE-ACTIVE</span>
              </div>
           </div>
           <div className="flex items-center space-x-6">
             {isSpeaking && (
               <div className="flex items-center space-x-1">
                 {[...Array(4)].map((_, i) => (
                   <div key={i} className={`w-1 rounded-full animate-bounce ${isMaster ? 'bg-red-600' : 'bg-white'}`} style={{ height: '12px', animationDelay: `${i * 0.1}s` }}></div>
                 ))}
               </div>
             )}
             <button onClick={stopAudio} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isSpeaking ? (isMaster ? 'bg-red-600 text-white' : 'bg-white text-black') : 'border-white/10 opacity-30'}`}>
                <i className={`fas ${isSpeaking ? 'fa-stop' : 'fa-volume-mute'}`}></i>
             </button>
           </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-40 xl:px-60 py-20 space-y-16 custom-scrollbar pb-64">
          {messages.length === 0 && !refiningPhase ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 fade-in-up">
              <AIOrb active={isProcessing || isSpeaking} isMaster={isMaster} />
              <h2 className={`fluid-title italic ${isMaster ? 'text-red-700' : 'text-white'}`}>YOKE</h2>
              <p className={`max-w-md text-sm font-bold tracking-widest uppercase ${isMaster ? 'text-red-500/60' : 'text-white/40'}`}>
                {isMaster ? '契约已成。现实的深渊正在向你敞开。' : '主权人格已就绪，正在实时解构变量。'}
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} fade-in-up space-y-4`}>
                <div className={`relative max-w-[90%] p-8 rounded-[2.5rem] message-text ${m.role === 'user' ? 'bg-white text-black font-bold' : (isMaster ? 'bg-[#1a0000] border-red-900/40 text-red-50/95' : 'bg-[#050505] border border-white/10 text-white/95') + ' whitespace-pre-wrap'}`}>
                   {m.content}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4">
                    {m.sources.map((s, idx) => (
                      <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-colors flex items-center space-x-2 ${isMaster ? 'bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-900/40' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
                        <i className="fas fa-link text-[8px] opacity-40"></i>
                        <span>{s.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {refiningPhase && <div className={`text-[6rem] sm:text-[8rem] font-black opacity-5 italic tracking-tighter animate-pulse select-none leading-none ${isMaster ? 'text-red-500' : ''}`}>{refiningPhase}</div>}
        </div>

        <div className="absolute bottom-8 left-4 right-4 lg:left-32 lg:right-32 z-50">
           <div className={`glass-panel p-4 flex items-end space-x-6 rounded-[3rem] transition-colors ${isMaster ? 'border-red-900/40' : 'border-white/10'}`}>
              <textarea 
                ref={textareaRef}
                value={input} 
                disabled={isProcessing} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder={isMaster ? "在这里下达你的主权指令..." : "在此注入推演变量..."} 
                className={`flex-1 bg-transparent border-none focus:ring-0 text-lg py-4 font-bold resize-none max-h-40 overflow-y-auto custom-scrollbar ${isMaster ? 'text-red-50 placeholder-red-900/40' : 'text-white placeholder-white/10'}`} 
                rows={1} 
              />
              <button onClick={handleSend} disabled={!input.trim() || isProcessing} className={`w-14 h-14 flex items-center justify-center rounded-full shrink-0 transition-all ${isMaster ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-white text-black'}`}>
                <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-play'} text-xl`}></i>
              </button>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
