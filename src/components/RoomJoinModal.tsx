import React, { useState } from 'react';
import TitleBar from './TitleBar';

interface RoomJoinModalProps {
  roomName: string;
  onClose: () => void;
  onSubmitPIN: (inputPin: string) => void;
  expectedPin: string;
}

export default function RoomJoinModal({ roomName, onClose, onSubmitPIN, expectedPin }: RoomJoinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() !== expectedPin) {
      setError("Incorrect PIN. ACCESS DENIED.");
      return;
    }
    onSubmitPIN(pin.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 select-none">
      <div className="w-full max-w-[300px] win95-outset p-[3px]">
        {/* Title bar */}
        <TitleBar title="Authentication Required" onClose={onClose} />

        {/* Content panel */}
        <form onSubmit={handleSubmit} className="p-3 text-xs text-black space-y-3">
          <div className="text-center font-bold">
            Channel <span className="font-mono text-blue-800 font-extrabold">#{roomName}</span> is PIN-protected.
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1">
            <label className="font-mono text-[10px] text-gray-600 block">ENTER CHANNEL KEY:</label>
            <input
              type="text"
              required
              maxLength={10}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              placeholder="****"
              className="win95-inset px-2 py-1 text-center font-mono font-extrabold text-sm tracking-widest bg-white text-black focus:outline-none w-[120px]"
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-1 text-[10px] font-mono text-center">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#a0a0a0]">
            <button
              type="button"
              onClick={onClose}
              className="win95-outset px-2.5 py-0.5 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="win95-outset px-4 py-0.5 font-bold hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active text-rose-800"
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
