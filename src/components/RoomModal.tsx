import React, { useState } from 'react';
import TitleBar from './TitleBar';

interface RoomModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string, isProtected: boolean, pin: string) => void;
}

export default function RoomModal({ onClose, onCreate }: RoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedName = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
    if (!formattedName) {
      setError("Please specify a valid channel name.");
      return;
    }
    if (formattedName.length < 2 || formattedName.length > 20) {
      setError("Channel name must be between 2 and 20 characters.");
      return;
    }

    if (isProtected) {
      if (!pin || pin.length < 4) {
        setError("PIN is required for protected channels and must be at least 4 characters.");
        return;
      }
    }

    onCreate(formattedName, description.trim(), isProtected, isProtected ? pin : '');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 select-none">
      <div className="w-full max-w-[360px] win95-outset p-[3px]">
        {/* Title bar */}
        <TitleBar title="Create New Chatroom" onClose={onClose} />

        {/* Content panel */}
        <form onSubmit={handleSubmit} className="p-3 text-xs text-black">
          <div className="space-y-3.5">
            <div>
              <label className="block font-bold mb-1">Room Name:</label>
              <div className="win95-inset px-2 py-1 flex items-center bg-white text-black">
                <span className="text-gray-500 font-mono mr-1 select-none">#</span>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                  placeholder="e.g. windows95"
                  className="w-full focus:outline-none font-mono font-bold"
                />
              </div>
              <span className="text-[10px] text-gray-500 block mt-0.5">Alphanumeric, dashes, underscores only.</span>
            </div>

            <div>
              <label className="block font-bold mb-1">Topic / Description:</label>
              <input
                type="text"
                maxLength={80}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The nostalgic mIRC hangout spot..."
                className="w-full win95-inset px-2 py-1 focus:outline-none"
              />
            </div>

            {/* Room Protection Selector */}
            <div className="bg-[#dfdfdf] p-2.5 border border-[#808080]">
              <label className="flex items-center gap-1.5 font-bold cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={(e) => {
                    setIsProtected(e.target.checked);
                    if (!e.target.checked) setPin('');
                  }}
                  className="scale-105"
                />
                PIN-Protected Channel
              </label>

              {isProtected && (
                <div>
                  <label className="block font-bold mb-1 text-[11px] text-red-800">Set Access PIN:</label>
                  <input
                    type="text"
                    required={isProtected}
                    maxLength={10}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="e.g. 1995"
                    className="w-[120px] win95-inset px-2 py-0.5 focus:outline-none font-mono text-center tracking-wide font-extrabold"
                  />
                  <span className="text-[9px] text-[#505050] block mt-0.5">Required for visitor entry.</span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-rose-100 border border-rose-400 text-rose-700 p-2 text-[11px] font-mono whitespace-normal break-words">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#a0a0a0]">
              <button
                type="button"
                onClick={onClose}
                className="win95-outset px-3 py-1 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] min-w-[70px] win95-btn-active"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="win95-outset px-4 py-1 font-bold text-blue-900 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] min-w-[75px] win95-btn-active"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
