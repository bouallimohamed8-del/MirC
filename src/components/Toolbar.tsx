import React, { useState } from 'react';
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  FolderPlus, 
  Monitor, 
  Sparkles,
  Users,
  Moon,
  Sun
} from 'lucide-react';
import { soundEngine } from '../utils/sounds';

interface ToolbarProps {
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
  onCreateRoom: () => void;
  onToggleCRT: () => void;
  isCRTOn: boolean;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onShowHelp: () => void;
  currentNickname: string;
}

export default function Toolbar({
  onConnect,
  onDisconnect,
  isConnected,
  onCreateRoom,
  onToggleCRT,
  isCRTOn,
  onToggleTheme,
  isDarkMode,
  onShowHelp,
  currentNickname
}: ToolbarProps) {
  const [isMuted, setIsMuted] = useState(soundEngine.getMute());

  const handleMuteToggle = () => {
    const nextMute = soundEngine.toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) {
      soundEngine.playMessage();
    }
  };

  return (
    <div className={`transition-colors duration-150 p-1 flex flex-col gap-1 select-none ${
      isDarkMode 
        ? 'bg-[#1a1a1a] border-b border-[#333] text-[#e0e0e0]' 
        : 'bg-[#c0c0c0] border-b border-t border-t-white border-b-black text-black'
    }`}>
      {/* File-Edit-View menu emulation */}
      <div className={`flex gap-4 text-xs px-2 py-0.5 ${
        isDarkMode 
          ? 'bg-[#141414] border-b border-[#333] text-[#e5e5e5]' 
          : 'border-b border-[#a0a0a0]'
      }`}>
        <div className={`cursor-pointer px-2 py-0.5 ${isDarkMode ? 'hover:bg-emerald-900 hover:text-[#e0e0e0]' : 'hover:bg-[#000080] hover:text-white'}`}>File</div>
        <div className={`cursor-pointer px-2 py-0.5 ${isDarkMode ? 'hover:bg-emerald-900 hover:text-[#e0e0e0]' : 'hover:bg-[#000080] hover:text-white'}`} onClick={onShowHelp}>Commands</div>
        <div className={`cursor-pointer px-2 py-0.5 ${isDarkMode ? 'hover:bg-emerald-900 hover:text-[#e0e0e0]' : 'hover:bg-[#000080] hover:text-white'}`} onClick={onCreateRoom}>Rooms</div>
        <div className={`cursor-pointer px-2 py-0.5 ${isDarkMode ? 'hover:bg-emerald-900 hover:text-[#e0e0e0]' : 'hover:bg-[#000080] hover:text-white'}`} onClick={onToggleCRT}>View</div>
        <div className={`cursor-pointer px-2 py-0.5 ${isDarkMode ? 'hover:bg-emerald-900 hover:text-[#e0e0e0]' : 'hover:bg-[#000080] hover:text-white'}`} onClick={onShowHelp}>Help</div>
      </div>

      {/* Button Rail */}
      <div className={`flex items-center justify-between flex-wrap gap-1 px-1 py-0.5 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-[#c0c0c0]'}`}>
        <div className="flex items-center gap-1 flex-wrap">
          {/* Connect / Disconnect */}
          {!isConnected ? (
            <button 
              onClick={onConnect}
              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 ${
                isDarkMode 
                  ? 'bg-[#222] hover:bg-[#333] text-emerald-400 border border-[#444] rounded-xs' 
                  : 'win95-outset hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active text-emerald-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Connect
            </button>
          ) : (
            <button 
              onClick={onDisconnect}
              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 ${
                isDarkMode 
                  ? 'bg-[#222] hover:bg-rose-950 text-rose-400 border border-rose-900 rounded-xs' 
                  : 'win95-outset hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active text-rose-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Disconnect
            </button>
          )}

          <div className={`w-[1.5px] h-5 mx-1 ${isDarkMode ? 'bg-[#333]' : 'bg-gray-500'}`}></div>

          {/* Create Room */}
          <button 
            onClick={onCreateRoom}
            disabled={!isConnected}
            className={`px-3 py-1 text-xs flex items-center gap-1.5 ${
              isDarkMode 
                ? 'bg-[#222] hover:bg-[#333] border border-[#444] text-[#e0e0e0] rounded-xs' 
                : 'win95-outset hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active'
            } ${!isConnected ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <FolderPlus className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`} />
            New Room
          </button>

          {/* Sound Mute Toggle */}
          <button 
            onClick={handleMuteToggle}
            className={`px-3 py-1 text-xs flex items-center gap-1.5 ${
              isDarkMode 
                ? 'bg-[#222] hover:bg-[#333] border border-[#444] text-[#e0e0e0] rounded-xs' 
                : 'win95-outset hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active'
            }`}
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
                Muted
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                Sound
              </>
            )}
          </button>

          <div className={`w-[1.5px] h-5 mx-1 ${isDarkMode ? 'bg-[#333]' : 'bg-gray-500'}`}></div>

          {/* CRT scanline toggler */}
          <button
            onClick={onToggleCRT}
            className={`px-3 py-1 text-xs flex items-center gap-1.5 ${
              isDarkMode 
                ? 'bg-[#121212] hover:bg-[#222] border border-[#333] text-[#e0e0e0]'
                : 'win95-outset hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active'
            } ${isCRTOn ? (isDarkMode ? '!bg-[#1a3a1a] !border-emerald-600 !text-emerald-400' : 'bg-[#98fb98] text-black') : ''}`}
            title="Toggle nostalgic green CRT phosphor terminal view overlay"
          >
            <Monitor className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-[#10bb10]'}`} />
            Scanlines: {isCRTOn ? "ON" : "OFF"}
          </button>

          {/* Dark / Retro terminal theme */}
          <button
            onClick={onToggleTheme}
            className={`px-3 py-1 text-xs flex items-center gap-1.5 ${
              isDarkMode 
                ? 'bg-[#222] hover:bg-[#333] border border-[#444] text-[#e0e0e0] rounded-xs' 
                : 'win95-outset hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active'
            }`}
            title="Toggle terminal scheme"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Windows 95 Light
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-800" />
                Terminal Mode
              </>
            )}
          </button>
        </div>

        {/* Current user stamp */}
        {isConnected && currentNickname && (
          <div className={`text-[11px] font-mono px-2 py-1 select-all border ${
            isDarkMode 
              ? 'bg-[#000] text-emerald-400 border-[#333]' 
              : 'bg-black text-lime-400 border-t-[#808080] border-l-[#808080] border-r-white border-b-white'
          }`}>
            NICK: &lt;<span className="font-extrabold">{currentNickname}</span>&gt;
          </div>
        )}
      </div>
    </div>
  );
}
