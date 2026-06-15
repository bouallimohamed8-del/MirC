import React from 'react';
import TitleBar from './TitleBar';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 select-none">
      <div className="w-full max-w-[420px] win95-outset p-[3px]">
        <TitleBar title="mIRC Help Manual & Commands" onClose={onClose} />

        <div className="p-3 text-xs text-black space-y-3 font-mono">
          <div className="bg-[#000080] text-white p-2 font-bold mb-2">
            IRC Traditional Command Terminal Guide
          </div>

          <p className="leading-tight">
            Nostalgic NetSpace chats support classic IRC slash commands entered directly in the bottom message input field.
          </p>

          <div className="bg-white text-black p-2 max-h-[220px] overflow-y-auto win95-inset space-y-2 text-[11px]">
            <div>
              <span className="font-bold text-amber-900 block">/join #channel</span>
              <span className="text-gray-600">Join or create a public channel.</span>
              <br />
              <span className="text-[10px] text-gray-500">Example: /join #90s_chat</span>
            </div>

            <div>
              <span className="font-bold text-amber-900 block">/me &lt;action&gt;</span>
              <span className="text-gray-600">Render an expressive action message.</span>
              <br />
              <span className="text-[10px] text-gray-500">Example: /me nods in agreement with the op</span>
            </div>

            <div>
              <span className="font-bold text-amber-900 block">/msg &lt;nickname&gt; &lt;text&gt;</span>
              <span className="text-gray-600">Start private message dialogue directly.</span>
              <br />
              <span className="text-[10px] text-gray-500">Example: /msg Alice hello there!</span>
            </div>

            <div>
              <span className="font-bold text-amber-900 block">/nick &lt;new_nickname&gt;</span>
              <span className="text-gray-600">Modify display nickname inside database.</span>
              <br />
              <span className="text-[10px] text-gray-500">Example: /nick RetroWeb_Master</span>
            </div>

            <div>
              <span className="font-bold text-amber-900 block">/away [message]</span>
              <span className="text-gray-600">Set status to &apos;Away&apos; with optional note.</span>
              <br />
              <span className="text-[10px] text-gray-500">Example: /away eating pizza</span>
            </div>

            <div>
              <span className="font-bold text-amber-900 block">/part</span>
              <span className="text-gray-600">Leave the current channel.</span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#a0a0a0]">
            <button
              onClick={onClose}
              className="win95-outset px-4 py-1 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] font-bold win95-btn-active min-w-[70px]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
