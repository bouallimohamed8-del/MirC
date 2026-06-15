import React, { useState } from 'react';
import { 
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { RETRO_AVATARS } from '../utils/avatars';
import TitleBar from './TitleBar';
import { soundEngine } from '../utils/sounds';

interface AuthWindowProps {
  onAuthSuccess: (nickname: string) => void;
  isDarkMode?: boolean;
}

type AuthMode = 'guest' | 'login' | 'register';

export default function AuthWindow({ onAuthSuccess, isDarkMode = false }: AuthWindowProps) {
  const [mode, setMode] = useState<AuthMode>('guest');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(RETRO_AVATARS[0].id);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const checkAndClaimNickname = async (uid: string, targetNick: string): Promise<boolean> => {
    const formattedNick = targetNick.trim();
    if (formattedNick.length < 2 || formattedNick.length > 20) {
      throw new Error("Nickname must be between 2 and 20 characters.");
    }
    const alphanumericRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!alphanumericRegex.test(formattedNick)) {
      throw new Error("Nickname can only contain alphanumeric characters, underscores, and dashes.");
    }

    const lowercaseNick = formattedNick.toLowerCase();
    const nicknameRef = doc(db, 'nicknames', lowercaseNick);
    const existingNickSnap = await getDoc(nicknameRef);

    if (existingNickSnap.exists()) {
      const ownerUid = existingNickSnap.data()?.uid;
      if (ownerUid !== uid) {
        return false; // Nickname taken
      }
    } else {
      // Reserve it!
      await setDoc(nicknameRef, {
        uid,
        nickname: formattedNick
      });
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const trimmedNickname = nickname.trim();

      if (mode === 'guest') {
        if (!trimmedNickname) {
          throw new Error('Please choose a nickname.');
        }

        // 1. Sign in anonymously
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        // 2. Claim unique nickname
        const success = await checkAndClaimNickname(uid, trimmedNickname);
        if (!success) {
          throw new Error(`The nickname "${trimmedNickname}" is already in use.`);
        }

        // 3. Create user profile in Firestore
        const userProfileRef = doc(db, 'users', uid);
        await setDoc(userProfileRef, {
          uid,
          nickname: trimmedNickname,
          role: 'Member',
          joinedAt: serverTimestamp(),
          status: 'online',
          avatar: selectedAvatar,
          friends: [],
          blocked: [],
          typingIn: ''
        });

        soundEngine.playStartup();
        onAuthSuccess(trimmedNickname);

      } else if (mode === 'register') {
        if (!trimmedNickname) {
          throw new Error('Please choose a nickname.');
        }
        if (!email.trim() || !password) {
          throw new Error('Email and password are required.');
        }

        // Validate nickname availability beforehand
        const lowercaseNick = trimmedNickname.toLowerCase();
        const nicknameRef = doc(db, 'nicknames', lowercaseNick);
        const checkSnap = await getDoc(nicknameRef);
        if (checkSnap.exists()) {
          throw new Error(`The nickname "${trimmedNickname}" is already in use.`);
        }

        // 1. Create firebase auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const uid = userCredential.user.uid;

        // 2. Lock-in nickname
        await setDoc(nicknameRef, {
          uid,
          nickname: trimmedNickname
        });

        // 3. Save profile
        const userProfileRef = doc(db, 'users', uid);
        await setDoc(userProfileRef, {
          uid,
          nickname: trimmedNickname,
          email: email.trim(),
          role: 'Member',
          joinedAt: serverTimestamp(),
          status: 'online',
          avatar: selectedAvatar,
          friends: [],
          blocked: [],
          typingIn: ''
        });

        soundEngine.playStartup();
        onAuthSuccess(trimmedNickname);

      } else if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Email and password are required.');
        }

        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const uid = userCredential.user.uid;

        // Read profile
        const userProfileRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userProfileRef);

        let activeNickname = 'IRCUser';
        if (userSnap.exists()) {
          const profileData = userSnap.data();
          activeNickname = profileData.nickname;
          
          // Re-update online status upon successful login
          await setDoc(userProfileRef, { 
            status: 'online' 
          }, { merge: true });
        } else {
          // Fallback nickname if profile somehow deleted
          activeNickname = email.split('@')[0];
          await setDoc(userProfileRef, {
            uid,
            nickname: activeNickname,
            role: 'Member',
            joinedAt: serverTimestamp(),
            status: 'online',
            avatar: selectedAvatar,
            friends: [],
            blocked: [],
            typingIn: ''
          });
        }

        soundEngine.playStartup();
        onAuthSuccess(activeNickname);
      }

    } catch (err: any) {
      console.error("Auth Failure", err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "That email address is already registered.";
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "Password must be at least 6 characters long.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = "Please enter a valid email address.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyMessage = "Incorrect email or password.";
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 overflow-auto ${
      isDarkMode ? 'elegant-dark bg-[#0c0c0c]' : 'bg-[#008080]'
    }`}>
      <div className={`w-full max-w-[420px] win95-outset p-[3px] ${
        isDarkMode ? 'border border-[#333]' : ''
      }`}>
        {/* Title bar */}
        <TitleBar title="mIRC Chat Setup Wizard - v1.0" isDarkMode={isDarkMode} />

        {/* Workspace panel */}
        <div className="p-3 text-black">
          <div className="flex gap-4 items-center bg-[#808080] p-3 text-white border-b border-t border-t-black border-b-white font-mono text-center mb-4">
            <div className={`text-4xl select-none font-crt animate-pulse ${isDarkMode ? 'text-emerald-400' : 'text-[#ffee00]'}`}>#</div>
            <div className="text-[11px] leading-tight text-left">
              <span className={`font-bold block ${isDarkMode ? 'text-emerald-400' : 'text-yellow-300'}`}>Welcome to retro IRC net!</span>
              No account required. Join instantly as a Guest, or sign up to secure your unique nickname.
            </div>
          </div>

          {/* Tab Selection */}
          <div className={`flex border-b mb-4 text-xs select-none ${isDarkMode ? 'border-[#333]' : 'border-[#808080]'}`}>
            {(['guest', 'login', 'register'] as AuthMode[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setMode(tab);
                  setErrorMsg('');
                }}
                className={`px-3 py-1 border-t border-r border-l border-b-0 rounded-t-sm -mb-[1px] font-bold ${
                  mode === tab
                    ? isDarkMode
                      ? 'bg-[#1a1a1a] border-t-[#333] border-l-[#333] border-r-[#333] border-b-[#1a1a1a] text-emerald-400 z-10 p-b-[2px]'
                      : 'bg-[#c0c0c0] border-t-white border-l-white border-r-black border-b-[#c0c0c0] z-10 p-b-[2px]'
                    : isDarkMode
                      ? 'bg-[#121212] border-[#333] text-gray-400 hover:bg-[#1a1a1a]'
                      : 'bg-[#b0b0b0] border-[#808080] text-gray-700 hover:bg-[#dfdfdf]'
                }`}
              >
                {tab === 'guest' && 'Guest Entry'}
                {tab === 'login' && 'Sign In'}
                {tab === 'register' && 'New Account'}
              </button>
            ))}
          </div>

          {/* Forms */}
          <form onSubmit={handleAuth} className="space-y-3.5 text-xs">
            {mode !== 'login' && (
              <div>
                <label className="block font-bold mb-1">Nickname (unique identifier):</label>
                <div className="win95-inset flex items-center px-2 py-1">
                  <span className="text-gray-500 font-mono select-none mr-1">@</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                    placeholder="e.g. RetroHacker"
                    className="w-full bg-transparent focus:outline-none font-mono font-bold"
                  />
                </div>
                <span className="text-[9px] text-[#404040] block mt-0.5">Alphanumeric, underscores, and dashes only.</span>
              </div>
            )}

            {mode !== 'guest' && (
              <div>
                <label className="block font-bold mb-1">Email Address:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@netspace.com"
                  className="w-full win95-inset px-2 py-1 focus:outline-none font-mono"
                />
              </div>
            )}

            {mode !== 'guest' && (
              <div>
                <label className="block font-bold mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full win95-inset px-2 py-1 focus:outline-none"
                />
              </div>
            )}

            {/* Avatar Selector for guest and register */}
            {mode !== 'login' && (
              <div>
                <label className="block font-bold mb-1">Select 8-Bit Pixel Character:</label>
                <div className="grid grid-cols-6 gap-2 bg-[#dfdfdf] p-2 win95-inset">
                  {RETRO_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`p-1 border border-transparent flex flex-col items-center gap-1 hover:bg-[#c0c0c0] ${
                        selectedAvatar === avatar.id 
                          ? 'bg-[#b0b0b0] border-[#000080]' 
                          : ''
                      }`}
                      title={avatar.name}
                    >
                      <div 
                        className="w-8 h-8 rounded shrink-0 overflow-hidden" 
                        dangerouslySetInnerHTML={{ __html: avatar.svg }} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-[11px] font-mono whitespace-normal break-words">
                <strong>Error:</strong> {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#a0a0a0]">
              <button
                type="submit"
                disabled={isLoading}
                className="win95-outset px-4 py-1.5 font-bold hover:bg-[#dfdfdf] active:bg-[#a0a0a0] min-w-[80px] text-center flex items-center justify-center win95-btn-active disabled:opacity-50"
              >
                {isLoading ? 'Wait...' : 'Join Net &gt;&gt;'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
