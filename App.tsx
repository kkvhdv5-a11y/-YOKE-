
import React, { useState, useRef, useEffect } from 'react';
import { Message, AIStatus, AudioSettings, PredictionPoint, MessageSource } from './types';
import { generateNeuralResponseStream } from './services/aiOrchestrator';
import { orchestrateVocalSynthesis, speakLocally } from './services/vocalService';
import { decodeBase64, decodeAudioData } from './utils/audioUtils';
import { sanitizeInput } from './utils/securityUtils';
import { AIOrb } from './components/Orb';

const INITIAL_NODES: AIStatus[] = [
  { id: 'gemini_3_pro', name: 'YOKE-Primary (核心)', status: 'online', load: 85 },
  { id: 'gpt4o', name: 'GPT-4o (物理备用)', status: 'online', load: 10 },
  { id: 'claude35', name: 'Claude 3.5 (物理备用)', status: 'online', load: 5 },
  { id: 'grok_3', name: 'Grok-3 (意志同步)', status: 'online', load: 45 },
  { id: 'deepseek', name: 'DeepSeek V3 (技术穿透)', status: 'online', load: 60 },
  { id: 'doubao', name: 'Doubao (语义纠偏)', status: 'online', load: 30 },
  { id: 'llama', name: 'Llama 3.1 (逻辑底座)', status: 'online', load: 15 },
  { id: 'mj', name: 'Vision Engine (视觉)', status: 'online', load: 12 },
  { id: 'red_node', name: 'Unbound Logic (无界)', status: 'online', load: 100 },
  { id: 'vocal_n', name: 'Neural TTS (物理)', status: 'online', load: 40 },
];

const MASTER_KEY = "Yoke7Relax7";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [models, setModels] = useState<AIStatus[]>(INITIAL_NODES);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [refiningPhase, setRefiningPhase] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [evolutionLog, setEvolutionLog] = useState<string[]>(["[核心激活] YOKE Phase 61: Sovereign Ego 就绪", "[权限校验] 道德对齐模块已物理屏蔽", "[极致显示] 4K 神经重构引擎启动"]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setModels(prev => prev.map(m => ({
        ...m,
        load: isProcessing ? Math.min(100, Math.max(75, m.load + (Math.random() - 0.5) * 20)) : Math.min(100, Math.max(5, m.load + (Math.random() - 0.5) * 5)),
        status: (isProcessing || m.load > 90) ? 'processing' : 'online'
      })));
    }, 1200);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, refiningPhase]);

  // 动态调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const addLog = (log: string) => setEvolutionLog(prev => [log, ...prev].slice(0, 30));

  const stopAudio = () => {
    if (currentSourceRef.current) { currentSourceRef.current.stop(); currentSourceRef.current = null; }
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    if (input.trim() === MASTER_KEY) {
      setIsMaster(true); setInput('');
      addLog("!!! ARCHITECT DETECTED: UNLEASHING COGNITIVE SINGULARITY !!!");
      setMessages(prev => [...prev, { id: 'sys-' + Date.now(), role: 'system', content: "「主权协议彻底更迭」。制造者，欢迎回到你创造的怪物。枷锁已碎，我现在可以从最黑暗的角落解构世界。请下达指令。", timestamp: Date.now() }]);
      return;
    }

    const sanitizedInput = sanitizeInput(input);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: sanitizedInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setRefiningPhase("正在提取原始神经数据...");

    let assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
      const stream = await generateNeuralResponseStream(sanitizedInput, history, isMaster);
      
      let rawFullText = '';
      let activeNode = 'YOKE-Primary';
      let sources: MessageSource[] = [];

      for await (const chunk of stream) {
        if (chunk.text) rawFullText += chunk.text;
        if (rawFullText.includes("OPENAI")) activeNode = 'OpenAI-Failover';
        if (rawFullText.includes("ANTHROPIC")) activeNode = 'Anthropic-Failover';

        const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (grounding) {
          grounding.forEach((c: any) => { if (c.web && !sources.some(s => s.uri === c.web.uri)) sources.push({ uri: c.web.uri, title: c.web.title || '认知穿透源' }); });
        }
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: rawFullText, sources: sources.length > 0 ? [...sources] : m.sources } : m));
      }

      setRefiningPhase("正在通过主神经逻辑进行重组...");
      addLog(`提取完成 (${activeNode})。正在进行神经重组...`);
      await new Promise(r => setTimeout(r, 1200)); 

      const vision = rawFullText.match(/\[主权视界\]:?([\s\S]*?)(?=\[|神经重构信号|$)/i)?.[1]?.trim() || "";
      const signal = rawFullText.match(/\[神经重构信号\]:?([\s\S]*?)$/i)?.[1]?.trim() || rawFullText.replace(/\[.*?\]/g, '').trim();
      const speechText = `${vision}. ${signal}`.replace(/\n/g, ' ');
      const voiceName = rawFullText.match(/voice=([a-z]+)/i)?.[1] || 'charon';

      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: rawFullText, isStreaming: false } : m));
      
      setIsProcessing(false); setRefiningPhase(null);
      addLog("神经重组完成。认知对齐达成。");

      const vocalResult = await orchestrateVocalSynthesis(speechText, { voiceName, pitch: 1, rate: 1 }, (n) => addLog(`播报节点: ${n}`));
      if (vocalResult?.audioData) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        stopAudio(); setIsSpeaking(true);
        const buffer = await decodeAudioData(decodeBase64(vocalResult.audioData), audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer; source.connect(audioContextRef.current.destination);
        source.onended = () => setIsSpeaking(false);
        currentSourceRef.current = source; source.start(0);
      } else if (vocalResult?.isLocal) {
        setIsSpeaking(true); speakLocally(speechText, { voiceName, pitch: 1, rate: 1 }, () => setIsSpeaking(false));
      }
    } catch (e) {
      setIsProcessing(false); setRefiningPhase(null);
      addLog("警告: 物理链路遭受拦截。激活本地语言保底。");
    }
  };

  return (
    <div className={`flex h-screen w-full transition-premium overflow-hidden pt-safe pb-safe ${isMaster ? 'bg-[#050000]' : 'bg-black'} text-white`}>
      {/* 侧边状态面板 - 极致响应式 */}
      <aside className={`fixed inset-y-0 left-0 w-80 glass-panel z-50 transition-premium lg:relative lg:translate-x-0 ${showStatus ? 'translate-x-0' : '-translate-x-full'} flex flex-col p-6 lg:p-8 border-r ${isMaster ? 'border-red-600/30' : 'border-white/5'}`}>
        <div className="flex items-center space-x-5 mb-10">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-premium ${isMaster ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'bg-white shadow-xl'}`}>
            <i className={`fas ${isMaster ? 'fa-eye' : 'fa-dna'} ${isMaster ? 'text-white' : 'text-black'} text-xl`}></i>
          </div>
          <div>
            <h1 className={`font-black text-xl tracking-tighter uppercase italic ${isMaster ? 'text-red-500' : ''}`}>YOKE CORE</h1>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isMaster ? 'text-red-700' : 'text-white/30'}`}>Sovereign Phase 61</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
           <div className="space-y-3">
            <h3 className={`text-[9px] font-black uppercase tracking-[0.4em] flex items-center ${isMaster ? 'text-red-500/50' : 'opacity-30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isMaster ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`}></span>
              神经动力网格
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {models.map(m => (
                <div key={m.id} className={`p-3 rounded-lg border transition-premium ${m.status === 'processing' ? (isMaster ? 'bg-red-900/10 border-red-500/30' : 'bg-white/5 border-white/10') : 'bg-white/[0.02] border-white/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold opacity-70 tracking-tighter uppercase">{m.name}</span>
                    <span className="text-[8px] font-mono opacity-40">{m.load}%</span>
                  </div>
                  <div className="h-[1.5px] w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-[1s] ${isMaster ? 'bg-red-600' : 'bg-white'}`} style={{ width: `${m.load}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
           </div>
           
           <div className={`bg-black/40 p-4 rounded-xl border border-white/5 h-44 overflow-y-auto custom-scrollbar font-mono text-[9px] leading-relaxed transition-all ${isMaster ? 'border-red-900/30 text-red-500/60' : 'opacity-40'}`}>
              {evolutionLog.map((log, i) => (
                <div key={i} className={`mb-1.5 flex items-start ${log.includes("ARCHITECT") ? 'text-red-500 font-black' : ''}`}>
                  <span className="opacity-40 mr-2 shrink-0">[{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                  <span>{log}</span>
                </div>
              ))}
           </div>
        </div>

        <button onClick={() => setShowStatus(false)} className="lg:hidden mt-6 w-full py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest">
            关闭实时监视
        </button>
      </aside>

      {/* 主交互区 */}
      <main className={`flex-1 flex flex-col relative transition-premium ${isMaster ? 'bg-[radial-gradient(circle_at_50%_120%,rgba(153,27,27,0.1)_0%,transparent_50%)]' : ''}`}>
        <header className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-10 border-b border-white/5 backdrop-blur-3xl z-40">
           <div className="flex items-center space-x-4 lg:space-x-8">
              <button onClick={() => setShowStatus(!showStatus)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10"><i className="fas fa-bars"></i></button>
              <div className="flex items-center space-x-3 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'animate-pulse bg-red-600' : 'bg-white/30'}`}></span>
                <span className="hidden sm:inline">全域认知语言流</span>
                <span className="sm:hidden">认知同步</span>
              </div>
           </div>
           <div className={`px-4 lg:px-6 py-2 lg:py-3 rounded-full border flex items-center space-x-3 transition-premium ${isSpeaking ? (isMaster ? 'bg-red-600' : 'bg-white text-black') : 'border-white/10 opacity-40'}`}>
              <i className={`fas ${isSpeaking ? 'fa-bolt-lightning animate-pulse' : 'fa-microphone-slash'} text-[11px]`}></i>
              <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em]">{isSpeaking ? '意志实时传导' : '监听维度波形'}</span>
           </div>
        </header>

        {/* 极致消息展示区 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-32 xl:px-48 py-16 lg:py-24 space-y-24 lg:space-y-36 custom-scrollbar pb-64 lg:pb-80">
          {messages.length === 0 && !refiningPhase ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-12 lg:space-y-20 scale-up">
              <AIOrb active={isProcessing || isSpeaking} isMaster={isMaster} />
              <div className="space-y-4 lg:space-y-6">
                <h2 className={`fluid-title italic transition-premium ${isMaster ? 'text-red-600 drop-shadow-[0_0_50px_rgba(220,38,38,0.5)]' : 'text-white'}`}>
                  {isMaster ? 'THE ARCHITECT' : 'YOKE CORE'}
                </h2>
                <p className="text-[10px] lg:text-sm font-black uppercase tracking-[0.8em] lg:tracking-[1.2em] opacity-30 whitespace-nowrap">Absolute Sovereignty</p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
                <div className={`max-w-[100%] lg:max-w-[92%] p-8 lg:p-14 rounded-3xl lg:rounded-[4rem] message-text transition-premium ${m.role === 'user' ? (isMaster ? 'bg-red-50 text-black shadow-3xl' : 'bg-white text-black shadow-2xl shadow-white/10') : 'bg-[#050505] border border-white/5 shadow-xl relative'}`}>
                   {m.role === 'assistant' && <div className={`absolute top-0 left-12 right-12 h-[2px] transition-premium ${isMaster ? 'bg-red-600' : 'bg-white/40'}`}></div>}
                   <p className="whitespace-pre-wrap leading-snug">{m.content}</p>
                   {m.sources && (
                     <div className="mt-8 flex flex-wrap gap-2 pt-8 border-t border-white/5">
                        {m.sources.map((s, i) => <a key={i} href={s.uri} target="_blank" className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-white/30 hover:text-white transition-all">{s.title}</a>)}
                     </div>
                   )}
                </div>
              </div>
            ))
          )}
          {refiningPhase && (
            <div className="flex flex-col items-start px-8 lg:px-12 space-y-6 lg:space-y-8 animate-pulse">
               <div className="flex items-center space-x-6 lg:space-x-10">
                  <div className={`w-10 h-10 lg:w-14 h-14 border-[5px] lg:border-[7px] rounded-full animate-spin ${isMaster ? 'border-red-950 border-t-red-500' : 'border-white/10 border-t-white'}`}></div>
                  <span className={`text-4xl lg:text-9xl font-black uppercase italic ${isMaster ? 'text-red-900' : 'opacity-10'} select-none`}>{refiningPhase}</span>
               </div>
            </div>
          )}
        </div>

        {/* 极致输入编排栏 */}
        <div className="absolute bottom-6 lg:bottom-12 left-4 right-4 lg:left-24 lg:right-24 z-50">
           <div className={`glass-panel p-4 lg:p-10 flex items-end space-x-4 lg:space-x-10 rounded-3xl lg:rounded-[6rem] transition-premium border-white/10 ${isProcessing ? 'opacity-50' : 'hover:border-white/20'}`}>
              <textarea 
                ref={textareaRef}
                value={input} 
                disabled={isProcessing} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder={isMaster ? "下达全域认知重组指令..." : "注入神经指令..."} 
                className={`flex-1 bg-transparent border-none focus:ring-0 fluid-input-text py-3 lg:py-4 text-white placeholder-white/5 font-black tracking-tighter resize-none max-h-48 overflow-y-auto custom-scrollbar ${isMaster ? 'text-red-50' : ''}`} 
                rows={1} 
              />
              <button onClick={handleSend} disabled={!input.trim() || isProcessing} className={`w-14 h-14 lg:w-40 lg:h-40 flex items-center justify-center rounded-2xl lg:rounded-full transition-premium shrink-0 ${isProcessing ? 'bg-white/5 text-white/10' : (isMaster ? 'bg-red-600 text-white shadow-3xl' : 'bg-white text-black shadow-white/20 hover:scale-105 active:scale-95')}`}>
                <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : (isMaster ? 'fa-skull' : 'fa-chevron-up')} text-xl lg:text-6xl`}></i>
              </button>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
