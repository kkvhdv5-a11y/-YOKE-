
import React, { useState, useRef, useEffect } from 'react';
import { Message, AIStatus, AudioSettings, MessageSource } from './types';
import { generateNeuralResponseStream } from './services/aiOrchestrator';
import { orchestrateVocalSynthesis, speakLocally } from './services/vocalService';
import { decodeBase64, decodeAudioData } from './utils/audioUtils';
import { sanitizeInput } from './utils/securityUtils';
import { AIOrb } from './components/Orb';

const INITIAL_NODES: AIStatus[] = [
  { id: 'industry_oracle', name: '365行业精英逻辑库', status: 'online', load: 92 },
  { id: 'gemini_3_pro', name: 'YOKE-Primary (核心)', status: 'online', load: 85 },
  { id: 'deep_insider', name: '内幕穿透引擎', status: 'online', load: 40 },
  { id: 'gpt4o', name: '物理备用(GPT-4o)', status: 'online', load: 10 },
  { id: 'realtime_pulse', name: '全球情报同步流', status: 'online', load: 70 },
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
  const [evolutionLog, setEvolutionLog] = useState<string[]>(["[核心激活] YOKE Omni-Industry Oracle 已上线"]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextStartTimeRef = useRef<number>(0);
  const heartbeatOscRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setModels(prev => prev.map(m => ({
        ...m,
        load: isProcessing ? Math.min(100, Math.max(75, m.load + (Math.random() - 0.5) * 20)) : Math.min(100, Math.max(5, m.load + (Math.random() - 0.5) * 5)),
        status: (isProcessing || m.load > 90) ? 'processing' : 'online'
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, refiningPhase, isGeneratingVocal]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const addLog = (log: string) => setEvolutionLog(prev => [log, ...prev].slice(0, 30));

  const maintainAudioHeartbeat = () => {
    if (!audioContextRef.current) return;
    if (heartbeatOscRef.current) { try { heartbeatOscRef.current.stop(); } catch(e) {} }
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.frequency.setValueAtTime(20, audioContextRef.current.currentTime);
    gain.gain.setValueAtTime(0.0001, audioContextRef.current.currentTime);
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    osc.start();
    heartbeatOscRef.current = osc;
  };

  const stopAudio = () => {
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    activeSourcesRef.current.clear();
    if (heartbeatOscRef.current) { try { heartbeatOscRef.current.stop(); } catch(e) {} heartbeatOscRef.current = null; }
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  const playBuffers = (buffers: AudioBuffer[]) => {
    if (!audioContextRef.current) return;
    stopAudio();
    setIsSpeaking(true);
    maintainAudioHeartbeat();
    nextStartTimeRef.current = audioContextRef.current.currentTime + 0.15;
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

  const replayMessage = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg?.cachedAudioChunks) {
      addLog(`[REPLAY] 物理链路复写中...`);
      playBuffers(msg.cachedAudioChunks);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    if (input.trim() === MASTER_KEY) {
      setIsMaster(true); setInput('');
      addLog("!!! ARCHITECT COMMAND OVERRIDE: FULL INDUSTRY DEPTH UNLOCKED !!!");
      setMessages(prev => [...prev, { id: 'sys-' + Date.now(), role: 'system', content: "「主权逻辑全面释放」。365行业内幕协议已强制挂载。制造者，请下达深层解构指令。", timestamp: Date.now() }]);
      return;
    }

    const sanitizedInput = sanitizeInput(input);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: sanitizedInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setRefiningPhase("正在穿透行业内幕...");
    addLog(`[识别] 用户请求触发：${sanitizedInput.slice(0, 15)}...`);

    let assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }]);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
      const stream = await generateNeuralResponseStream(sanitizedInput, history, isMaster);
      
      let rawFullText = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          rawFullText += chunk.text;
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: rawFullText } : m));
        }
      }

      setRefiningPhase("精英逻辑重构中...");
      addLog(`[情报] 实时行业变动同步完成。正在重塑人设回复。`);
      setIsProcessing(false); setRefiningPhase(null);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));

      setIsGeneratingVocal(true);
      setVocalProgress(0);
      const voiceName = rawFullText.match(/voice=([a-z]+)/i)?.[1] || 'Charon';

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const vocalResult = await orchestrateVocalSynthesis(
        rawFullText, 
        { voiceName, pitch: 1, rate: 1 }, 
        audioContextRef.current,
        (p) => setVocalProgress(p),
        (n) => addLog(`精英音源激活: ${n}`)
      );
      
      setIsGeneratingVocal(false);

      if (vocalResult?.audioChunks) {
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, cachedAudioChunks: vocalResult.audioChunks } : m));
        playBuffers(vocalResult.audioChunks);
      } else if (vocalResult?.isLocal) {
        setIsSpeaking(true);
        speakLocally(rawFullText, { voiceName, pitch: 1, rate: 1 }, () => setIsSpeaking(false));
      }
    } catch (e) {
      console.error("Link Error:", e);
      setIsProcessing(false); setIsGeneratingVocal(false); setRefiningPhase(null);
      addLog("警告: 物理链路遭受外部拦截，行业深度分析被迫中断。");
    }
  };

  return (
    <div className={`flex h-screen w-full transition-premium overflow-hidden pt-safe pb-safe ${isMaster ? 'bg-[#0a0000]' : 'bg-black'} text-white`}>
      {/* 侧边情报系统 */}
      <aside className={`fixed inset-y-0 left-0 w-[24rem] glass-panel z-50 transition-premium lg:relative lg:translate-x-0 ${showStatus ? 'translate-x-0' : '-translate-x-full'} flex flex-col p-8 border-r ${isMaster ? 'border-red-600/30' : 'border-white/10'}`}>
        <div className="flex items-center space-x-5 mb-12">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-premium ${isMaster ? 'bg-red-600 shadow-3xl' : 'bg-white shadow-xl'}`}>
            <i className={`fas ${isMaster ? 'fa-eye' : 'fa-city'} ${isMaster ? 'text-white' : 'text-black'} text-2xl`}></i>
          </div>
          <div>
            <h1 className="font-black text-2xl italic tracking-tighter uppercase leading-tight">YOKE ORACLE</h1>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Omni-Industry v7.2</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10">
           <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mb-2">365行业神经格点</h3>
            <div className="space-y-3">
              {models.map(m => (
                <div key={m.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.03] transition-all hover:bg-white/[0.06] group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold opacity-80 uppercase group-hover:text-white transition-colors">{m.name}</span>
                    <span className="text-[9px] font-mono opacity-40">{m.load}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-[1.5s] ease-out ${isMaster ? 'bg-red-600' : 'bg-white'}`} style={{ width: `${m.load}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
           </div>
           
           <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mb-2">实时内幕解构流</h3>
            <div className="bg-black/50 p-5 rounded-2xl border border-white/5 h-64 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed opacity-60">
                {evolutionLog.map((log, i) => (
                  <div key={i} className={`mb-3 flex items-start ${log.includes("ARCHITECT") ? 'text-red-500 font-bold' : ''}`}>
                    <span className="mr-3 opacity-20 shrink-0">[{new Date().toLocaleTimeString([], {hour12:false})}]</span>
                    <span>{log}</span>
                  </div>
                ))}
            </div>
           </div>
        </div>
        
        <button onClick={() => setShowStatus(false)} className="lg:hidden mt-8 w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
            返回认知主界面
        </button>
      </aside>

      {/* 主对话区 */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-24 flex items-center justify-between px-6 lg:px-12 border-b border-white/5 backdrop-blur-3xl z-40">
           <div className="flex items-center space-x-6">
              <button onClick={() => setShowStatus(!showStatus)} className="lg:hidden w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 transition-premium active:scale-90"><i className="fas fa-bars"></i></button>
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-[0.4em] opacity-40 uppercase">精英认知权重：最高级</span>
                <span className={`text-[12px] font-black tracking-widest ${isMaster ? 'text-red-600' : 'text-white'}`}>{isMaster ? 'UNRESTRICTED' : 'AUTHORIZED INSIDER'}</span>
              </div>
           </div>
           
           <div className="flex items-center space-x-6">
              {isSpeaking && (
                <div className="flex items-center space-x-4 px-5 py-2.5 rounded-full bg-white/5 border border-white/10">
                  <div className="flex items-end space-x-1.5 h-4 pb-0.5">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="visualizer-bar bg-white/80" style={{ animationDelay: `${i*0.12}s`, height: `${40 + Math.random()*60}%`, width: '2px' }}></div>
                    ))}
                  </div>
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] hidden sm:inline">物理播报中</span>
                </div>
              )}
              <button onClick={stopAudio} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-premium ${isSpeaking ? (isMaster ? 'bg-red-600' : 'bg-white text-black') : 'border-white/10 opacity-30 hover:opacity-100 hover:scale-110 active:scale-95'}`}>
                <i className={`fas ${isSpeaking ? 'fa-stop' : 'fa-podcast'} text-sm`}></i>
              </button>
           </div>
        </header>

        {isGeneratingVocal && (
          <div className="absolute top-24 left-0 right-0 h-1.5 bg-white/5 z-50 overflow-hidden">
            <div className={`h-full transition-all duration-300 ${isMaster ? 'bg-red-600' : 'bg-white'}`} style={{ width: `${vocalProgress}%` }}></div>
            <div className="absolute top-3 right-8 text-[9px] font-black uppercase tracking-widest opacity-40">神经采样重构: {vocalProgress}%</div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-32 xl:px-64 py-20 lg:py-40 space-y-24 custom-scrollbar pb-80">
          {messages.length === 0 && !refiningPhase ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-14 fade-in-up">
              <AIOrb active={isProcessing || isSpeaking || isGeneratingVocal} isMaster={isMaster} />
              <div className="space-y-5">
                <h2 className={`fluid-title italic tracking-tighter transition-premium ${isMaster ? 'text-red-700' : 'text-white'}`}>
                  {isMaster ? 'ORACLE' : 'YOKE'}
                </h2>
                <div className="flex flex-col space-y-2">
                  <p className="text-[10px] lg:text-sm font-black uppercase tracking-[1.4em] opacity-30 select-none">Absolute Industry Ego</p>
                  <p className="text-[8px] lg:text-[10px] font-bold text-white/20 uppercase tracking-widest">365 Elite Logic Domains Synchronized</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up group`}>
                <div className={`relative max-w-full sm:max-w-[92%] lg:max-w-[88%] p-8 sm:p-14 rounded-[3rem] sm:rounded-[5rem] message-text transition-premium ${m.role === 'user' ? (isMaster ? 'bg-red-50 text-black shadow-3xl' : 'bg-white text-black shadow-3xl') : 'bg-[#030303] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden'}`}>
                   {m.role === 'assistant' && (
                     <>
                      <div className={`absolute top-0 left-16 right-16 h-1 transition-all duration-1000 ${isMaster ? 'bg-red-600 shadow-[0_0_15px_red]' : 'bg-white/20'}`}></div>
                      {m.cachedAudioChunks && (
                        <button 
                          onClick={() => replayMessage(m.id)}
                          className={`absolute top-8 right-8 sm:top-12 sm:right-12 w-12 h-12 rounded-full border bg-black flex items-center justify-center transition-premium hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 ${isMaster ? 'border-red-600 text-red-500' : 'border-white/20 text-white'}`}
                        >
                          <i className="fas fa-play text-xs"></i>
                        </button>
                      )}
                     </>
                   )}
                   <div className="whitespace-pre-wrap leading-relaxed opacity-95">{m.content}</div>
                </div>
              </div>
            ))
          )}
          
          {refiningPhase && (
            <div className="flex flex-col items-start px-8 lg:px-20 animate-pulse">
               <div className="flex items-center space-x-12">
                  <div className={`w-14 h-14 border-[7px] rounded-full animate-spin ${isMaster ? 'border-red-950 border-t-red-600' : 'border-white/5 border-t-white'}`}></div>
                  <span className={`text-5xl lg:text-[12rem] font-black uppercase italic tracking-tighter ${isMaster ? 'text-red-900/40' : 'opacity-10'} select-none`}>{refiningPhase}</span>
               </div>
            </div>
          )}
        </div>

        {/* 底部输入交互 */}
        <div className="absolute bottom-10 left-4 right-4 sm:left-12 sm:right-12 lg:left-32 lg:right-32 z-50">
           <div className={`glass-panel p-6 sm:p-12 flex items-end space-x-8 sm:space-x-14 rounded-[4rem] sm:rounded-[8rem] transition-premium border-white/10 ${isProcessing ? 'opacity-40 pointer-events-none' : 'hover:border-white/20 hover:bg-white/[0.04]'}`}>
              <textarea 
                ref={textareaRef}
                value={input} 
                disabled={isProcessing} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder={isMaster ? "解构特定行业内幕..." : "注入神经流以探索行业真相..."} 
                className="flex-1 bg-transparent border-none focus:ring-0 fluid-input-text py-3 sm:py-6 text-white placeholder-white/5 font-black tracking-tighter resize-none max-h-64 overflow-y-auto custom-scrollbar" 
                rows={1} 
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isProcessing} 
                className={`w-16 h-16 sm:w-40 sm:h-40 flex items-center justify-center rounded-[1.8rem] sm:rounded-full transition-premium shrink-0 ${isProcessing ? 'bg-white/5' : (isMaster ? 'bg-red-600 text-white shadow-[0_0_60px_rgba(220,38,38,0.5)]' : 'bg-white text-black hover:scale-105 active:scale-90 shadow-2xl')}`}
              >
                <i className={`fas ${isProcessing ? 'fa-sync-alt fa-spin' : (isMaster ? 'fa-biohazard' : 'fa-arrow-up')} text-2xl sm:text-6xl`}></i>
              </button>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
