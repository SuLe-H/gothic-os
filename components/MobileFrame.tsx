import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface MobileFrameProps {
  children: React.ReactNode;
  showStatusBar?: boolean;
}

const StatusBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-12 flex items-end justify-between px-7 pb-2 text-xs font-sans text-neutral-300 select-none shrink-0 z-50">
      <span className="font-semibold">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <div className="flex items-center gap-2">
        <Icon.Wifi className="w-3 h-3" />
        <Icon.Battery className="w-4 h-4" />
      </div>
    </div>
  );
};

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, showStatusBar = true }) => {
  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center sm:py-8 font-sans">
      {/* 
         Phone Chassis Simulation
         - Mobile: Full width/height.
         - Desktop: Fixed iPhone dimensions (393x852), rounded corners, simulated bezel.
      */}
      <div className="w-full h-[100dvh] sm:w-[393px] sm:h-[852px] sm:max-h-[90vh] bg-[#0f0f0f] text-gray-200 overflow-hidden flex flex-col shadow-2xl relative sm:rounded-[55px] sm:border-[12px] sm:border-[#1a1a1a] ring-1 ring-white/10 transition-all duration-300">
        
        {/* Desktop Notch Simulation */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-[#1a1a1a] rounded-b-2xl z-[60] pointer-events-none"></div>

        {showStatusBar && <StatusBar />}

        <div className="flex-1 flex flex-col overflow-hidden relative z-0 w-full">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-neutral-600/50 rounded-full z-50 pointer-events-none"></div>
      </div>
    </div>
  );
};