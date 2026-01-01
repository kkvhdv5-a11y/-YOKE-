
import React from 'react';

export const AIOrb: React.FC<{ active: boolean; isMaster?: boolean }> = ({ active, isMaster }) => {
  return (
    <div className="relative w-56 h-56 sm:w-96 sm:h-96 flex items-center justify-center transition-premium group">
      {/* 外部重力场环 */}
      <div className={`absolute inset-0 rounded-full border border-white/5 transition-all duration-[3s] ${active ? 'scale-150 rotate-180' : 'scale-100 rotate-0'}`}></div>
      
      {/* 神经交互层 1 */}
      <div className={`absolute inset-4 rounded-full border border-white/10 animate-spin-slow ${active ? 'opacity-100 scale-125' : 'opacity-20'} ${isMaster ? 'border-red-500/30' : ''}`} style={{ animationDuration: '25s' }}></div>
      
      {/* 神经交互层 2 */}
      <div className={`absolute inset-12 rounded-full border border-white/5 animate-spin-slow-reverse ${active ? 'opacity-80 scale-110' : 'opacity-10'} ${isMaster ? 'border-red-500/20' : ''}`} style={{ animationDuration: '15s' }}></div>
      
      {/* 主权核心球体 */}
      <div className={`relative w-28 h-28 sm:w-48 sm:h-48 rounded-full transition-all duration-[1.2s] ease-out flex items-center justify-center overflow-hidden
        ${active ? 'scale-110' : 'scale-100'} 
        ${isMaster ? 'bg-red-600 shadow-[0_0_120px_rgba(220,38,38,0.6)]' : 'bg-white shadow-[0_0_80px_rgba(255,255,255,0.4)]'}`}>
        
        {/* 内聚能核心 */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-30'} ${isMaster ? 'bg-gradient-to-br from-red-400 via-red-600 to-black' : 'bg-gradient-to-tr from-gray-200 via-white to-gray-50'}`}></div>
        
        {/* 动态纹理 */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)] animate-pulse"></div>
        
        <span className={`text-3xl sm:text-6xl font-black italic tracking-tighter z-10 select-none transition-colors duration-1000 ${isMaster ? 'text-white' : 'text-black'}`}>YOKE</span>
      </div>

      {/* 随机神经脉冲 */}
      {active && (
        <div className="absolute inset-[-20%] pointer-events-none">
            {[...Array(24)].map((_, i) => (
                <div 
                    key={i} 
                    className={`absolute w-[2px] h-[2px] rounded-full animate-ping ${isMaster ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-white shadow-[0_0_10px_white]'}`}
                    style={{
                        top: `${50 + 45 * Math.sin(i * (360/24) * Math.PI / 180)}%`,
                        left: `${50 + 45 * Math.cos(i * (360/24) * Math.PI / 180)}%`,
                        animationDelay: `${i * 0.08}s`,
                        animationDuration: `${1 + Math.random()}s`,
                        opacity: 0.6
                    }}
                />
            ))}
        </div>
      )}
      
      {/* 外部氛围晕染 */}
      <div className={`absolute inset-[-40%] rounded-full blur-[100px] transition-all duration-[2s] ${active ? 'opacity-40 scale-125' : 'opacity-0 scale-100'} ${isMaster ? 'bg-red-900/50' : 'bg-white/10'}`}></div>
    </div>
  );
};
