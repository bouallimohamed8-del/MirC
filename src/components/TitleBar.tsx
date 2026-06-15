import React from 'react';
import { Minimize2, Square, X } from 'lucide-react';

interface TitleBarProps {
  title: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isActive?: boolean;
  isDarkMode?: boolean;
}

export default function TitleBar({ title, onClose, onMinimize, onMaximize, isActive = true, isDarkMode = false }: TitleBarProps) {
  return (
    <div 
      className={`px-2 select-none flex items-center justify-between font-bold text-xs shrink-0 transition-all duration-150 ${
        isDarkMode 
          ? 'h-8 bg-[#1a1a1a] border-b border-[#333] text-[#e0e0e0] font-mono'
          : `h-[22px] ${isActive 
              ? 'bg-gradient-to-r from-[#000080] to-[#1080d0] text-white' 
              : 'bg-[#808080] text-[#c0c0c0]'}`
      }`}
      id="title-bar-draggable"
    >
      <div className="flex items-center gap-2 truncate">
        {isDarkMode ? (
          <div className="w-3.5 h-3.5 bg-emerald-500 rounded-xs shrink-0 animate-pulse"></div>
        ) : (
          /* Short vintage IRC logo icon */
          <span className="font-mono text-[10px] bg-white text-black px-0.5 border border-black leading-none font-black shrink-0">
            #
          </span>
        )}
        <span className="truncate tracking-tight uppercase">{title}</span>
      </div>

      <div className="flex gap-1 items-center shrink-0">
        {onMinimize && (
          <button 
            onClick={onMinimize}
            className={`w-4 h-4 flex items-center justify-center hover:brightness-110 ${
              isDarkMode 
                ? 'bg-[#333] border border-[#444] text-[#e0e0e0]'
                : 'bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-br-white active:border-bl-white'
            }`}
          >
            <div className={`w-2 h-0.5 mt-2 ${isDarkMode ? 'bg-[#e0e0e0]' : 'bg-black'}`}></div>
          </button>
        )}
        {onMaximize && (
          <button 
            onClick={onMaximize}
            className={`w-4 h-4 flex items-center justify-center hover:brightness-110 ${
              isDarkMode 
                ? 'bg-[#333] border border-[#444] text-[#e0e0e0]'
                : 'bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-br-white active:border-bl-white'
            }`}
          >
            <Square className={`w-2 h-2 fill-none stroke-[2] ${isDarkMode ? 'text-[#e0e0e0]' : 'text-black'}`} />
          </button>
        )}
        {onClose && (
          <button 
            onClick={onClose}
            className={`w-4 h-4 flex items-center justify-center font-black hover:brightness-110 ${
              isDarkMode 
                ? 'bg-[#333] border border-[#444] text-[#e0e0e0] hover:bg-emerald-950'
                : 'bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-br-white active:border-bl-white'
            }`}
          >
            <X className={`w-2.5 h-2.5 stroke-[3] ${isDarkMode ? 'text-[#e0e0e0]' : 'text-black'}`} />
          </button>
        )}
      </div>
    </div>
  );
}
