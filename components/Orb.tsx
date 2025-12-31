
import React from 'react';

export const AIOrb: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <div className="relative w-48 h-48 sm:w-72 sm:h-72 flex items-center justify-center transition-premium">
      {/* 动态光环 */}
      <div className={`absolute inset-0 rounded-full border border-white/10 animate-spin-slow ${active ? 'opacity-100 scale-125' : 'opacity-20 scale-100'} transition-all duration-[2s]`} style={{ animationDuration: '12s' }}></div>
      <div className={`absolute inset-6 sm:inset-10 rounded-full border border-white/5 animate-spin-slow-reverse ${active ? 'opacity-80 scale-110' : 'opacity-10'}`} style={{ animationDuration: '20s' }}></div>
      
      {/* 核心球体 */}
      <div className={`relative w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-white shadow-[0_0_100px_rgba(255,255,255,0.5)] flex items-center justify-center overflow-hidden transition-all duration-[1s] ${active ? 'scale-110' : 'scale-100'}`}>
        <div className={`absolute inset-0 bg-gradient-to-tr from-gray-200 via-white to-gray-100 ${active ? 'animate-pulse' : ''}`}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)]"></div>
        <span className="text-black font-black text-2xl sm:text-5xl tracking-tighter z-10 italic select-none">YOKE</span>
      </div>

      {/* 神经脉冲粒子 */}
      {active && (
        <div className="absolute inset-0">
            {[...Array(16)].map((_, i) => (
                <div 
                    key={i} 
                    className="absolute w-1 h-1 bg-white rounded-full animate-ping opacity-40"
                    style={{
                        top: `${50 + 48 * Math.sin(i * 22.5 * Math.PI / 180)}%`,
                        left: `${50 + 48 * Math.cos(i * 22.5 * Math.PI / 180)}%`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '3s'
                    }}
                />
            ))}
        </div>
      )}
      
      {/* 外部散射光晕 */}
      <div className={`absolute inset-0 bg-white/5 rounded-full blur-[80px] transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-0'}`}></div>
    </div>
  );
};
