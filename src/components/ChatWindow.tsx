import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Volume2, Trash2, Shield, EyeOff, AlertTriangle } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { soundEngine } from '../utils/sounds';

interface ChatWindowProps {
  activeId: string;
  activeName: string;
  isRoom: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  currentUserProfile: UserProfile | null;
  blockedUsers: string[];
  roomOwnerId?: string;
  onDeleteChannel?: () => void;
  typingUsers: string[];
  onStartTyping: () => void;
  onBlockUser: (uid: string) => void;
  onAddFriend: (uid: string) => void;
  roomDescription?: string;
}

export default function ChatWindow({
  activeId,
  activeName,
  isRoom,
  messages,
  onSendMessage,
  currentUserProfile,
  blockedUsers,
  roomOwnerId,
  onDeleteChannel,
  typingUsers,
  onStartTyping,
  onBlockUser,
  onAddFriend,
  roomDescription
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<any>(null);
  const prevMessagesCount = useRef(messages.length);

  // Scroll to bottom on new messages
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio Alerts on new incoming messages
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && currentUserProfile && lastMsg.senderId !== currentUserProfile.uid) {
        // Check blocklist
        const isBlocked = blockedUsers.includes(lastMsg.senderId);
        if (!isBlocked) {
          // Check mention
          const hasMention = lastMsg.text.toLowerCase().includes(`@${currentUserProfile.nickname.toLowerCase()}`);
          if (!isRoom || hasMention) {
            soundEngine.playPrivateMessage();
          } else {
            soundEngine.playMessage();
          }
        }
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages, currentUserProfile, isRoom, blockedUsers]);

  // Handle typing notification throttle
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (onStartTyping) {
      onStartTyping();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await onSendMessage(inputText.trim());
      setInputText('');
    } catch (e) {
      console.error("Message send failure:", e);
    }
  };

  // Humanize timestamp format
  const formatTime = (epochMs: number) => {
    if (!epochMs) return '';
    const date = new Date(epochMs);
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `[${hours}:${mins}]`;
  };

  // Convert role to vintage status flag prefix: @ for Admin, % for Moderator
  const getRankPrefix = (role?: string, ownerId?: string, senderId?: string) => {
    if (ownerId && senderId && ownerId === senderId) {
      return '@'; // Channel Operator
    }
    if (role === 'Admin') return '@';
    if (role === 'Moderator') return '%';
    return '';
  };

  const getRankColor = (role?: string, ownerId?: string, senderId?: string) => {
    if (ownerId && senderId && ownerId === senderId) {
      return 'text-red-700 font-extrabold'; // Channel Op
    }
    if (role === 'Admin') return 'text-red-600 font-extrabold';
    if (role === 'Moderator') return 'text-violet-700 font-bold';
    return 'text-blue-800';
  };

  // Process message text highlights (emojis, links, mentions)
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.text;

    // 1. Slash action /me command emulation
    if (msg.type === 'me' || text.startsWith('/me ')) {
      const actionText = text.startsWith('/me ') ? text.substring(4) : text;
      return (
        <span className="italic text-purple-700 font-semibold">
          * {msg.senderNickname} {actionText}
        </span>
      );
    }

    // 2. System messages
    if (msg.isSystem || msg.type === 'system') {
      return (
        <span className="text-gray-500 font-mono text-[10px]">
          *** {text}
        </span>
      );
    }

    // 3. Normal text with mentions highlights
    const isMentioned = currentUserProfile && text.toLowerCase().includes(`@${currentUserProfile.nickname.toLowerCase()}`);
    
    // Quick regex for styling tags or standard web URLs
    const parts = text.split(/(\B@\w+|\bhttps?:\/\/\S+)/ig);

    return (
      <span className={`${isMentioned ? 'bg-[#ffffbf] border border-[#dcdc6c] px-1 font-bold rounded-sm' : ''}`}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <span key={index} className="text-rose-700 font-bold font-mono">
                {part}
              </span>
            );
          } else if (part.match(/^https?:\/\//i)) {
            return (
              <a 
                key={index} 
                href={part} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-800 underline hover:text-blue-600 font-mono break-all"
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  // Remove messages from blocked users
  const visibleMessages = useMemo(() => {
    return messages.filter(msg => !blockedUsers.includes(msg.senderId));
  }, [messages, blockedUsers]);

  const isCurrentUserOwner = currentUserProfile && roomOwnerId === currentUserProfile.uid;

  return (
    <div className="flex flex-col h-full bg-[#dfdfdf] border-l border-t border-t-white border-l-white flex-1 text-black overflow-hidden relative">
      
      {/* Top Description/Control banner */}
      <div className="bg-[#c0c0c0] px-3 py-1.5 border-b border-b-black border-t border-t-white flex items-center justify-between font-mono text-[11px] shrink-0 select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="font-extrabold text-blue-900 font-mono">
            {isRoom ? `#${activeName}` : `@${activeName}`}
          </span>
          {isRoom && roomDescription && (
            <span className="text-gray-600 truncate border-l border-gray-400 pl-2">
              Topic: &quot;{roomDescription}&quot;
            </span>
          )}
        </div>

        {/* Channel moderator/owner controls */}
        {isRoom && isCurrentUserOwner && onDeleteChannel && (
          <button 
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to permanently delete channel #${activeName}? This cannot be undone.`)) {
                onDeleteChannel();
              }
            }}
            className="win95-outset px-2 py-0.5 text-xs text-red-800 hover:bg-red-50 flex items-center gap-1 active:bg-red-100 win95-btn-active"
            title="Delete Chatroom"
          >
            <Trash2 className="w-3 h-3" />
            Delete Room
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-2 bg-white font-mono text-[11px] leading-relaxed win95-inset select-text selection:bg-slate-300">
        
        {/* Welcome message */}
        <div className="text-gray-400 border-b border-gray-100 pb-2 mb-2 select-none">
          *** Logged into NetSpace IRC Server (ports 3000)
          <br />
          *** Local Host Time: {new Date().toLocaleTimeString()}
          <br />
          *** Type <span className="text-blue-900 font-bold">/help</span> anywhere to see supported traditional slash commands.
        </div>

        {/* Render visible chat line items */}
        {visibleMessages.length === 0 ? (
          <div className="text-gray-400 italic text-[10px] mt-2 select-none">
            - - - No message logs in this thread - - -
          </div>
        ) : (
          <div className="space-y-1 my-1">
            {visibleMessages.map((msg) => {
              const prefix = getRankPrefix(msg.senderRole, roomOwnerId, msg.senderId);
              const colorClass = getRankColor(msg.senderRole, roomOwnerId, msg.senderId);
              
              const isSystem = msg.isSystem || msg.type === 'system';

              return (
                <div key={msg.id} className="flex gap-1.5 items-start text-xs group py-0.5 hover:bg-slate-50 rounded-sm">
                  {/* Left aligned time stamp */}
                  <span className="text-gray-400 select-none shrink-0 font-mono text-[10px] mt-0.5">
                    {formatTime(msg.createdAt)}
                  </span>

                  {/* Nickname and Content */}
                  <div className="break-all flex-1">
                    {!isSystem && (
                      <span className="mr-1.5 select-none shrink-0 font-bold">
                        &lt;
                        <span className={`${colorClass} hover:underline cursor-pointer`} title="Interactive profile controls">
                          {prefix}{msg.senderNickname}
                        </span>
                        &gt;
                      </span>
                    )}

                    {/* Content display */}
                    <span className="text-black">
                      {renderMessageContent(msg)}
                    </span>
                  </div>

                  {/* Tiny Quick Actions for admins/mods or users */}
                  {!isSystem && currentUserProfile && msg.senderId !== currentUserProfile.uid && (
                    <div className="hidden group-hover:flex gap-1 select-none shrink-0 text-[9px] font-sans pr-1">
                      <button 
                        onClick={() => onBlockUser(msg.senderId)}
                        className="text-red-700 underline hover:text-red-500 cursor-pointer"
                        title="Block postings from this user"
                      >
                        [Block]
                      </button>
                      <button 
                        onClick={() => onAddFriend(msg.senderId)}
                        className="text-blue-800 underline hover:text-blue-600 cursor-pointer"
                        title="Add to Friends list"
                      >
                        [+Friend]
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div ref={msgEndRef} />
      </div>

      {/* Typing user info overlay */}
      {typingUsers.length > 0 && (
        <div className="bg-[#dfdfdf] px-3 py-0.5 text-[10px] font-mono text-gray-600 italic animate-pulse border-t border-[#c0c0c0] shrink-0 select-none">
          ✦ {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Form Input bar */}
      <form onSubmit={handleSend} className="p-1.5 bg-[#c0c0c0] border-t border-t-white flex gap-1 items-center shrink-0 select-none">
        <div className="win95-inset bg-white px-2 py-1 flex items-center flex-1">
          <span className="text-gray-500 font-mono text-xs font-black mr-1.5 select-none">
            {isRoom ? '>' : '✍'}
          </span>
          <input
            type="text"
            required
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              isRoom 
                ? `Post message to #${activeName}... (or type /me <action>)` 
                : `Type private message to ${activeName}...`
            }
            className="w-full bg-transparent text-xs text-black font-mono focus:outline-none placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          className="win95-outset p-1.5 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] flex items-center justify-center shrink-0 win95-btn-active"
          title="Send Message"
        >
          <Send className="w-3.5 h-3.5 text-blue-900" />
        </button>
      </form>
    </div>
  );
}
