import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './utils/firebase';
import { UserProfile, Room, ChatMessage, Conversation, PrivateMessage, UserStatus } from './types';

// Components
import TitleBar from './components/TitleBar';
import Toolbar from './components/Toolbar';
import AuthWindow from './components/AuthWindow';
import RoomModal from './components/RoomModal';
import RoomJoinModal from './components/RoomJoinModal';
import ChatWindow from './components/ChatWindow';
import HelpModal from './components/HelpModal';

// Utilities
import { getAvatarSvg, RETRO_AVATARS } from './utils/avatars';
import { soundEngine } from './utils/sounds';

// Icons
import {
  Search,
  Users,
  MessageSquare,
  ShieldAlert,
  Volume2,
  Tv,
  HelpCircle,
  Hash,
  ChevronRight,
  UserCheck,
  UserX,
  Lock,
  Compass,
  Bell,
  CheckCircle,
  Settings,
  AlertOctagon,
  LogOut
} from 'lucide-react';

export default function App() {
  // Authentication & Presence
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [nickname, setNickname] = useState('');

  // Active Chats & Channels
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeId, setActiveId] = useState<string>('lobby'); // defaults to lobby channel
  const [activeName, setActiveName] = useState<string>('lobby');
  const [isRoom, setIsRoom] = useState<boolean>(true); // true = room, false = direct private message
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // User list presence
  const [allConnectedUsers, setAllConnectedUsers] = useState<UserProfile[]>([]);
  const [searchNickname, setSearchNickname] = useState('');

  // Modals & Panels visibility
  const [showRoomCreate, setShowRoomCreate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pinProtectedRoom, setPinProtectedRoom] = useState<Room | null>(null);
  const [selectedProfileCard, setSelectedProfileCard] = useState<UserProfile | null>(null);

  // App Aesthetic States
  const [isCRTOn, setIsCRTOn] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Resizable Panels States
  const [sidebarWidth, setSidebarWidth] = useState(210);
  const [userlistWidth, setUserlistWidth] = useState(180);

  // Typing status management
  const typingTimeoutRef = useRef<any>(null);

  // Dragging indicators
  const isDraggingSidebar = useRef(false);
  const isDraggingUserlist = useRef(false);

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar.current) {
        // Enforce boundaries
        const newWidth = Math.max(150, Math.min(350, e.clientX));
        setSidebarWidth(newWidth);
      } else if (isDraggingUserlist.current) {
        const viewportWidth = window.innerWidth;
        const newWidth = Math.max(140, Math.min(300, viewportWidth - e.clientX));
        setUserlistWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingSidebar.current = false;
      isDraggingUserlist.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 1. Listen to Authentication Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Setup listener for user profile
        const profileRef = doc(db, 'users', user.uid);
        onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const profile: UserProfile = {
              uid: data.uid,
              nickname: data.nickname,
              role: data.role || 'Member',
              joinedAt: data.joinedAt?.toMillis() || Date.now(),
              status: data.status || 'online',
              statusMessage: data.statusMessage || '',
              avatar: data.avatar || 'retro_coder',
              friends: data.friends || [],
              blocked: data.blocked || [],
              typingIn: data.typingIn || ''
            };
            setUserProfile(profile);
            setNickname(profile.nickname);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setNickname('');
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen to available Public Channels
  useEffect(() => {
    if (!currentUser) return;

    const roomsQuery = query(collection(db, 'rooms'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(roomsQuery, (snap) => {
      const list: Room[] = [];
      let lobbyExists = false;

      snap.forEach((d) => {
        const item = d.data();
        if (item.name === 'lobby') lobbyExists = true;
        list.push({
          id: item.id,
          name: item.name,
          description: item.description || '',
          isProtected: item.isProtected || false,
          pin: item.pin || '',
          ownerId: item.ownerId,
          createdAt: item.createdAt?.toMillis() || Date.now(),
          memberCount: item.memberCount || 0
        });
      });

      setRooms(list);

      // Auto-create default general chamber (#lobby) if it's missing
      if (!lobbyExists && list.length === 0) {
        const defaultLobbyId = 'lobby';
        setDoc(doc(db, 'rooms', defaultLobbyId), {
          id: defaultLobbyId,
          name: 'lobby',
          description: 'The global community vestibule.',
          isProtected: false,
          ownerId: 'system',
          createdAt: serverTimestamp(),
          memberCount: 0
        }).catch(err => console.error("Lobby creation error:", err));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'rooms');
    });

    return unsubscribe;
  }, [currentUser]);

  // 3. Listen to Online Users
  useEffect(() => {
    if (!currentUser) return;

    const usersQuery = query(collection(db, 'users'), where('status', 'in', ['online', 'away']));
    const unsubscribe = onSnapshot(usersQuery, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          uid: data.uid,
          nickname: data.nickname,
          role: data.role || 'Member',
          joinedAt: data.joinedAt?.toMillis() || Date.now(),
          status: data.status || 'online',
          statusMessage: data.statusMessage || '',
          avatar: data.avatar || 'retro_coder',
          friends: data.friends || [],
          blocked: data.blocked || [],
          typingIn: data.typingIn || ''
        });
      });
      setAllConnectedUsers(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return unsubscribe;
  }, [currentUser]);

  // 4. Listen to Direct Messages threads listing
  useEffect(() => {
    if (!currentUser) return;

    const convQuery = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(convQuery, (snap) => {
      const list: Conversation[] = [];
      snap.forEach((pair) => {
        const d = pair.data();
        list.push({
          id: d.id,
          participants: d.participants,
          updatedAt: d.updatedAt?.toMillis() || Date.now(),
          lastMessage: d.lastMessage || ''
        });
      });
      setConversations(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'conversations');
    });

    return unsubscribe;
  }, [currentUser]);

  // 5. Download Chat messages in real time for ACTIVE chat screen
  useEffect(() => {
    if (!currentUser || !activeId) return;

    let unsubscribe: () => void;

    if (isRoom) {
      // Room collection message listeners
      const msgQuery = query(
        collection(db, 'rooms', activeId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(200)
      );

      unsubscribe = onSnapshot(msgQuery, (snap) => {
        const list: ChatMessage[] = [];
        snap.forEach((item) => {
          const d = item.data();
          list.push({
            id: d.id,
            text: d.text,
            senderId: d.senderId,
            senderNickname: d.senderNickname,
            senderAvatar: d.senderAvatar,
            senderRole: d.senderRole,
            createdAt: d.createdAt?.toMillis() || Date.now(),
            isSystem: d.isSystem || false,
            type: d.type || 'text'
          });
        });
        setMessages(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `rooms/${activeId}/messages`);
      });
    } else {
      // DM Conversation listeners
      const msgQuery = query(
        collection(db, 'conversations', activeId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(200)
      );

      unsubscribe = onSnapshot(msgQuery, (snap) => {
        const list: ChatMessage[] = [];
        snap.forEach((item) => {
          const d = item.data();
          list.push({
            id: d.id,
            text: d.text,
            senderId: d.senderId,
            senderNickname: d.senderNickname,
            senderAvatar: d.senderAvatar,
            createdAt: d.createdAt?.toMillis() || Date.now(),
            type: 'text'
          });
        });
        setMessages(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `conversations/${activeId}/messages`);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, activeId, isRoom]);

  // Increment room visitor counts when activeId changes
  useEffect(() => {
    if (!currentUser || !isRoom || !activeId) return;

    const roomRef = doc(db, 'rooms', activeId);
    setDoc(roomRef, { memberCount: arrayUnion(currentUser.uid) }, { merge: true })
      .catch((err) => console.log("Visitor increment note:", err));

    return () => {
      setDoc(roomRef, { memberCount: arrayRemove(currentUser.uid) }, { merge: true })
        .catch((err) => console.log("Visitor decrement note:", err));
    };
  }, [currentUser, activeId, isRoom]);

  // Typing state update
  const handleStartTyping = () => {
    if (!currentUser) return;

    const profileRef = doc(db, 'users', currentUser.uid);
    setDoc(profileRef, { typingIn: activeId }, { merge: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setDoc(profileRef, { typingIn: '' }, { merge: true });
    }, 4500);
  };

  // List of active room typing nicknames
  const activeTypingNicknames = useMemo(() => {
    if (!currentUser) return [];
    return allConnectedUsers
      .filter(u => u.uid !== currentUser.uid && u.typingIn === activeId)
      .map(u => u.nickname);
  }, [allConnectedUsers, activeId, currentUser]);

  // Search filter
  const filteredUsers = useMemo(() => {
    if (!searchNickname.trim()) return allConnectedUsers;
    return allConnectedUsers.filter(u => 
      u.nickname.toLowerCase().includes(searchNickname.toLowerCase())
    );
  }, [allConnectedUsers, searchNickname]);

  // Active room details
  const activeRoomDetail = useMemo(() => {
    if (!isRoom) return null;
    return rooms.find(r => r.id === activeId);
  }, [rooms, activeId, isRoom]);

  // Active room operator/owner
  const activeRoomOwnerId = activeRoomDetail?.ownerId;

  // Connected users list in current ACTIVE room
  const activeChannelMembers = useMemo(() => {
    if (!isRoom) return [];
    // For general lobby, everyone online is shown as a connected user
    if (activeId === 'lobby') return allConnectedUsers;
    
    // For other rooms, we can show active users whose profile typing or active session records exist, 
    // or simulate active attendees. To be simple and robust, we display online users as participants,
    // which facilitates instant chatting and engagement!
    return allConnectedUsers;
  }, [allConnectedUsers, activeId, isRoom]);

  // Push notifications helper
  const addNotification = (notif: string) => {
    setNotifications(prev => [notif, ...prev.slice(0, 15)]);
    soundEngine.playJoin();
  };

  // Connect action
  const handleConnect = () => {
    if (!currentUser) return;
    const profileRef = doc(db, 'users', currentUser.uid);
    setDoc(profileRef, { status: 'online' }, { merge: true })
      .then(() => addNotification(`Joined the retro server connection.`));
  };

  // Disconnect / Signout action
  const handleDisconnect = async () => {
    try {
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid);
        await setDoc(profileRef, { status: 'offline', typingIn: '' }, { merge: true });
      }
      await signOut(auth);
      setMessages([]);
      addNotification(`Disconnected from Internet NetSpace server.`);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle user Presence Select
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentUser) return;
    const nextStatus = e.target.value as UserStatus;
    const profileRef = doc(db, 'users', currentUser.uid);
    await setDoc(profileRef, { status: nextStatus }, { merge: true });
    addNotification(`Your status is updated to: ${nextStatus.toUpperCase()}`);
  };

  // Send Message Logic incorporating Traditional Slash IRC Commands
  const handleSendMessage = async (text: string) => {
    if (!currentUser || !userProfile) return;

    // A. Parse Core Traditional Slash Commands
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const cmd = parts[0].toLowerCase();
      const bodyArgs = parts.slice(1).join(' ');

      if (cmd === '/help') {
        setShowHelp(true);
        return;
      }

      if (cmd === '/me') {
        if (!bodyArgs.trim()) return;
        // Perform action emote
        await sendDirectOrRoomMessage(bodyArgs.trim(), 'me');
        return;
      }

      if (cmd === '/part') {
        // Return to lobby
        setActiveId('lobby');
        setActiveName('lobby');
        setIsRoom(true);
        addNotification(`Left channel.`);
        return;
      }

      if (cmd === '/away') {
        const profileRef = doc(db, 'users', currentUser.uid);
        await setDoc(profileRef, { 
          status: 'away', 
          statusMessage: bodyArgs.trim() || 'Away from keyboard' 
        }, { merge: true });
        addNotification(`You are now marked Away: "${bodyArgs.trim() || 'Away from keyboard'}"`);
        return;
      }

      if (cmd === '/join') {
        if (!bodyArgs.trim()) return;
        let channelName = bodyArgs.trim().replace(/^#/, '');
        const foundRoom = rooms.find(r => r.name.toLowerCase() === channelName.toLowerCase());
        
        if (foundRoom) {
          handleSelectRoom(foundRoom);
        } else {
          // Create new public room instantly
          await handleCreateRoomDirect(channelName, 'Newly spawned room', false, '');
        }
        return;
      }

      if (cmd === '/msg') {
        const spaceIdx = bodyArgs.indexOf(' ');
        if (spaceIdx === -1) return;
        const targetNick = bodyArgs.substring(0, spaceIdx).trim();
        const msgBody = bodyArgs.substring(spaceIdx + 1).trim();

        const targetUser = allConnectedUsers.find(u => u.nickname.toLowerCase() === targetNick.toLowerCase());
        if (!targetUser) {
          addNotification(`User "${targetNick}" is not online.`);
          return;
        }

        // Start private conversation
        const convId = getConversationId(currentUser.uid, targetUser.uid);
        const convRef = doc(db, 'conversations', convId);
        await setDoc(convRef, {
          id: convId,
          participants: [currentUser.uid, targetUser.uid],
          updatedAt: serverTimestamp(),
          lastMessage: msgBody
        });

        // Write message
        const messagesRef = collection(db, 'conversations', convId, 'messages');
        const customId = doc(messagesRef).id;
        await setDoc(doc(messagesRef, customId), {
          id: customId,
          text: msgBody,
          senderId: currentUser.uid,
          senderNickname: userProfile.nickname,
          senderAvatar: userProfile.avatar,
          createdAt: serverTimestamp()
        });

        // Set focus to the DM
        setActiveId(convId);
        setActiveName(targetUser.nickname);
        setIsRoom(false);
        return;
      }

      if (cmd === '/nick') {
        if (!bodyArgs.trim()) return;
        const nextNick = bodyArgs.trim();

        try {
          const lowercaseNick = nextNick.toLowerCase();
          const nicknameRef = doc(db, 'nicknames', lowercaseNick);
          const claimCheck = await getDoc(nicknameRef);

          if (claimCheck.exists()) {
            addNotification(`Nickname "${nextNick}" is already registered.`);
            return;
          }

          // Release old nick doc
          const prevNickDoc = doc(db, 'nicknames', userProfile.nickname.toLowerCase());
          await deleteDoc(prevNickDoc);

          // Claims new
          await setDoc(nicknameRef, {
            uid: currentUser.uid,
            nickname: nextNick
          });

          // Update profile
          const profileRef = doc(db, 'users', currentUser.uid);
          await setDoc(profileRef, { nickname: nextNick }, { merge: true });
          addNotification(`NICK change approved: you are now "${nextNick}"`);

        } catch (e: any) {
          addNotification(`Nick change failed: ${e.message}`);
        }
        return;
      }

      // Unrecognized slash command
      addNotification(`Unknown command "${cmd}". Type /help to view valid options.`);
      return;
    }

    // B. Normal text sending
    await sendDirectOrRoomMessage(text, 'text');
  };

  const sendDirectOrRoomMessage = async (content: string, type: 'text' | 'me') => {
    if (!currentUser || !userProfile) return;

    if (isRoom) {
      const messagesRef = collection(db, 'rooms', activeId, 'messages');
      const msgId = doc(messagesRef).id;
      await setDoc(doc(messagesRef, msgId), {
        id: msgId,
        text: content,
        senderId: currentUser.uid,
        senderNickname: userProfile.nickname,
        senderAvatar: userProfile.avatar,
        senderRole: userProfile.role,
        createdAt: serverTimestamp(),
        type: type
      });
    } else {
      // DM Conversation message
      const messagesRef = collection(db, 'conversations', activeId, 'messages');
      const msgId = doc(messagesRef).id;
      await setDoc(doc(messagesRef, msgId), {
        id: msgId,
        text: content,
        senderId: currentUser.uid,
        senderNickname: userProfile.nickname,
        senderAvatar: userProfile.avatar,
        createdAt: serverTimestamp()
      });

      // Update parent dialogue header
      const convRef = doc(db, 'conversations', activeId);
      await setDoc(convRef, {
        lastMessage: type === 'me' ? `* ${userProfile.nickname} ${content}` : content,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  };

  // Helper helper to format conversational sorting IDs
  const getConversationId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Choose / open a room selection
  const handleSelectRoom = (room: Room) => {
    if (room.isProtected) {
      setPinProtectedRoom(room);
    } else {
      setActiveId(room.id);
      setActiveName(room.name);
      setIsRoom(true);
    }
  };

  // Join protected PIN room once PIN validates
  const handleJoinProtectedVerified = (room: Room) => {
    setActiveId(room.id);
    setActiveName(room.name);
    setIsRoom(true);
    setPinProtectedRoom(null);
  };

  // Create room modal submission
  const handleCreateRoomSubmit = async (name: string, description: string, isProtected: boolean, pin: string) => {
    await handleCreateRoomDirect(name, description, isProtected, pin);
    setShowRoomCreate(false);
  };

  const handleCreateRoomDirect = async (name: string, description: string, isProtected: boolean, pin: string) => {
    if (!currentUser) return;
    const cleanName = name.replace(/[^a-zA-Z0-9_\-]/g, '').toLowerCase();
    const roomId = doc(collection(db, 'rooms')).id;

    const roomData = {
      id: roomId,
      name: cleanName,
      description: description || 'No description set.',
      isProtected,
      pin: pin || '',
      ownerId: currentUser.uid,
      createdAt: serverTimestamp(),
      memberCount: 0
    };

    await setDoc(doc(db, 'rooms', roomId), roomData);
    
    // Automatically focus new room
    setActiveId(roomId);
    setActiveName(cleanName);
    setIsRoom(true);
    addNotification(`Created new room #${cleanName}`);
  };

  // Delete channel
  const handleDeleteActiveRoom = async () => {
    if (!isRoom || activeId === 'lobby') return;
    const roomRef = doc(db, 'rooms', activeId);
    await deleteDoc(roomRef);
    
    // Return to lobby
    setActiveId('lobby');
    setActiveName('lobby');
    setIsRoom(true);
    addNotification(`Room was successfully deleted.`);
  };

  // Quick initiate direct talk
  const handleStartPrivateChat = (user: UserProfile) => {
    if (!currentUser) return;
    const id = getConversationId(currentUser.uid, user.uid);
    
    // Create convo doc
    setDoc(doc(db, 'conversations', id), {
      id,
      participants: [currentUser.uid, user.uid],
      updatedAt: serverTimestamp(),
      lastMessage: 'Conversation initiated.'
    }, { merge: true }).then(() => {
      setActiveId(id);
      setActiveName(user.nickname);
      setIsRoom(false);
      setSelectedProfileCard(null);
    });
  };

  // Block a user profile Uid
  const handleBlockUserToggle = async (targetUid: string) => {
    if (!currentUser || !userProfile) return;
    const isBlocked = userProfile.blocked.includes(targetUid);
    const profileRef = doc(db, 'users', currentUser.uid);

    if (isBlocked) {
      await setDoc(profileRef, {
        blocked: arrayRemove(targetUid)
      }, { merge: true });
      addNotification(`User was unblocked.`);
    } else {
      await setDoc(profileRef, {
        blocked: arrayUnion(targetUid)
      }, { merge: true });
      addNotification(`User was fully blocked. Their messages will be filtered.`);
    }
  };

  // Add / Remove Friend profile Uid
  const handleFriendUserToggle = async (targetUid: string) => {
    if (!currentUser || !userProfile) return;
    const isFriend = userProfile.friends.includes(targetUid);
    const profileRef = doc(db, 'users', currentUser.uid);

    if (isFriend) {
      await setDoc(profileRef, {
        friends: arrayRemove(targetUid)
      }, { merge: true });
      addNotification(`Removed user from Friends list.`);
    } else {
      await setDoc(profileRef, {
        friends: arrayUnion(targetUid)
      }, { merge: true });
      addNotification(`Added user to Friends list!`);
    }
  };

  // Bootstrapping splash
  if (!authChecked) {
    return (
      <div className="fixed inset-0 bg-[#008080] flex flex-col items-center justify-center p-4">
        <div className="w-[180px] bg-[#c0c0c0] win95-outset p-3 text-center text-xs text-black font-mono">
          <div className="animate-bounce text-xl mb-2 font-crt">NETSPACE</div>
          Checking server ports...
          <div className="w-full h-4 win95-inset mt-2 bg-gray-200 overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 bg-blue-800 animate-[pulse_1.5s_infinite] w-[40%]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show wizard
  if (!currentUser) {
    return <AuthWindow onAuthSuccess={() => handleConnect()} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden relative ${
      isCRTOn ? 'crt-scanlines' : ''
    } ${
      isDarkMode ? 'elegant-dark bg-[#0c0c0c]' : 'bg-[#008080]'
    }`}>
      
      {/* Dynamic scanlines indicator if terminal is enabled */}
      {isDarkMode && (
        <div className="absolute top-2 right-2 flex justify-center items-center select-none text-[10px] font-mono text-emerald-400 z-20 pointer-events-none gap-2">
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          TERMINAL MODE: ELEGANT DARK
        </div>
      )}

      {/* Main retro mIRC application panel window */}
      <div className={`m-1 md:m-3 flex-1 flex flex-col win95-outset overflow-hidden ${
        isDarkMode ? 'border border-[#333] !bg-[#0c0c0c]' : 'border-t-white border-l-white bg-[#c0c0c0]'
      }`}>
        
        {/* Major Titlebar */}
        <TitleBar 
          title={`mIRC32 - [ ${activeName} ]`} 
          isDarkMode={isDarkMode}
          onClose={() => {
            if (window.confirm("Do you want to exit NetSpace IRC client session?")) {
              handleDisconnect();
            }
          }}
          onMinimize={() => addNotification("Window minimized (status is still connected).")}
          onMaximize={() => addNotification("Application maximized.")}
        />

        {/* Nostalgic vintage menu band */}
        <Toolbar 
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          isConnected={!!currentUser}
          onCreateRoom={() => setShowRoomCreate(true)}
          onToggleCRT={() => setIsCRTOn(!isCRTOn)}
          isCRTOn={isCRTOn}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isDarkMode={isDarkMode}
          onShowHelp={() => setShowHelp(true)}
          currentNickname={nickname}
        />

        {/* Main Tri-Panel Window Body Area */}
        <div className="flex-1 flex overflow-hidden relative p-[2px] bg-[#808080] border-t border-t-black border-b border-b-white gap-[3px]">
          
          {/* COLUMN 1: LEFT SIDEBAR (Rooms list, Direct list, friends) */}
          <div 
            className="flex flex-col select-none shrink-0 bg-[#c0c0c0] border-r border-r-white border-b border-b-white overflow-hidden text-black text-xs"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Folder tab layout inside Sidebar */}
            <div className="bg-[#808080] text-white px-2 py-1 font-bold text-[10px] font-mono flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              CHANNELS FOLDER
            </div>

            {/* Public Channels List */}
            <div className="flex-1 overflow-y-auto p-1 bg-white win95-inset h-[40%] text-xs">
              <div className="text-gray-500 font-mono font-bold text-[9px] px-1 mb-1 border-b border-gray-100">
                ACTIVE ROOMS ({rooms.length})
              </div>
              <div className="space-y-0.5">
                {rooms.map((room) => {
                  const isActive = isRoom && room.id === activeId;
                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className={`w-full text-left font-mono px-1.5 py-0.5 flex items-center justify-between hover:bg-[#000080] hover:text-white group ${
                        isActive ? 'bg-[#000080] text-white font-extrabold shadow-sm' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate text-[11px]">
                        <Hash className={`w-3.5 h-3.5 text-blue-800 shrink-0 group-hover:text-white ${isActive ? 'text-white' : ''}`} />
                        <span className="truncate">#{room.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0 text-[10px]">
                        {room.isProtected && <Lock className="w-2.5 h-2.5 text-red-700" />}
                        <span className={`px-1 bg-gray-200 text-gray-700 rounded-sm text-[9px] ${
                          isActive ? 'bg-blue-900 text-white' : ''
                        }`}>
                          {room.memberCount || 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Draggable Divider Bar */}
            <div className="h-[2px] bg-[#808080] cursor-row-resize shrink-0"></div>

            {/* Direct Conversations / Dialogs list */}
            <div className="flex-1 overflow-y-auto p-1 bg-white win95-inset h-[40%] text-xs">
              <div className="text-gray-500 font-mono font-bold text-[9px] px-1 mb-1 border-b border-gray-100">
                DIRECT DIALOGUES ({conversations.length})
              </div>
              <div className="space-y-0.5">
                {conversations.length === 0 ? (
                  <div className="text-[10px] text-gray-400 p-1 italic">None active</div>
                ) : (
                  conversations.map((conv) => {
                    // Find target user nickname
                    const targetUid = conv.participants.find(p => p !== currentUser.uid);
                    const targetUser = allConnectedUsers.find(u => u.uid === targetUid);
                    
                    const displayNick = targetUser ? targetUser.nickname : 'Offline User';
                    const isActive = !isRoom && conv.id === activeId;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setActiveId(conv.id);
                          setActiveName(displayNick);
                          setIsRoom(false);
                        }}
                        className={`w-full text-left font-mono px-1.5 py-0.5 flex items-center justify-between hover:bg-[#000080] hover:text-white ${
                          isActive ? 'bg-[#000080] text-white font-extrabold shadow-sm' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1 truncate text-[11px]">
                          <MessageSquare className="w-3 h-3 text-emerald-800 shrink-0" />
                          <span className="truncate">{displayNick}</span>
                        </div>
                        {targetUser && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notification Center Tray */}
            <div className="bg-[#c0c0c0] p-1 border-t border-t-white flex flex-col shrink-0 select-none text-[11px]">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="win95-outset w-full py-1 text-center font-bold font-mono text-[10px] flex items-center justify-center gap-1 hover:bg-[#dfdfdf] win95-btn-active"
              >
                <Bell className="w-3 h-3 text-amber-800" />
                SYSTEM NOTIFICATIONS ({notifications.length})
              </button>
              {showNotifications && (
                <div className="max-h-[85px] overflow-y-auto bg-white border border-gray-500 p-1 m-1 text-[9px] font-mono rounded-sm select-text text-gray-700">
                  {notifications.length === 0 ? (
                    <div className="text-gray-400 italic">No events generated</div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="border-b border-gray-100 py-0.5 last:border-0 truncate">
                        • {n}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 1 VERTICAL SLIDING HANDLE RESIZER */}
          <div 
            className="w-[4px] bg-[#c0c0c0] cursor-col-resize hover:bg-[#c0c0c0]/90 active:bg-blue-800 shrink-0 self-stretch"
            onMouseDown={(e) => {
              isDraggingSidebar.current = true;
              document.body.style.cursor = 'col-resize';
            }}
          ></div>

          {/* COLUMN 2: CENTER WORKSPACE (Chat Panel) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#808080]">
            <ChatWindow 
              activeId={activeId}
              activeName={activeName}
              isRoom={isRoom}
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUserProfile={userProfile}
              blockedUsers={userProfile?.blocked || []}
              roomOwnerId={activeRoomOwnerId}
              onDeleteChannel={handleDeleteActiveRoom}
              typingUsers={activeTypingNicknames}
              onStartTyping={handleStartTyping}
              onBlockUser={handleBlockUserToggle}
              onAddFriend={handleFriendUserToggle}
              roomDescription={activeRoomDetail?.description}
            />
          </div>

          {/* COLUMN 2 VERTICAL SLIDING HANDLE RESIZER */}
          <div 
            className="w-[4px] bg-[#c0c0c0] cursor-col-resize hover:bg-[#c0c0c0]/90 active:bg-blue-800 shrink-0 self-stretch"
            onMouseDown={(e) => {
              isDraggingUserlist.current = true;
              document.body.style.cursor = 'col-resize';
            }}
          ></div>

          {/* COLUMN 3: RIGHT PANEL (Connected Users inside active room, user search, profiles) */}
          <div 
            className="flex flex-col select-none shrink-0 bg-[#c0c0c0] border-l border-l-white border-b border-b-white overflow-hidden text-black text-xs"
            style={{ width: `${userlistWidth}px` }}
          >
            <div className="bg-[#808080] text-white px-2 py-1 font-bold text-[10px] font-mono flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                MEMBERS LIST
              </div>
              <span className="bg-blue-900 text-white rounded px-1 text-[9px]">
                {activeChannelMembers.length}
              </span>
            </div>

            {/* Quick search panel */}
            <div className="p-1 border-b border-gray-400 flex items-center bg-[#dfdfdf] gap-1 shrink-0">
              <Search className="w-3 h-3 text-gray-500 shrink-0" />
              <input
                type="text"
                maxLength={15}
                value={searchNickname}
                onChange={(e) => setSearchNickname(e.target.value)}
                placeholder="Find nickname..."
                className="w-full win95-inset bg-white text-[10px] px-1 py-0.5 focus:outline-none"
              />
            </div>

            {/* Users listing */}
            <div className="flex-1 overflow-y-auto p-1 bg-white win95-inset text-xs space-y-0.5 font-mono">
              {filteredUsers.length === 0 ? (
                <div className="text-[10px] text-gray-400 p-2 text-center select-none italic">
                  No matching users
                </div>
              ) : (
                filteredUsers.map((member) => {
                  const isCurrent = member.uid === currentUser.uid;
                  const isFriend = userProfile?.friends.includes(member.uid);
                  const isBlocked = userProfile?.blocked.includes(member.uid);

                  // Operator badge: @ if owner, % if Mod/Admin
                  let badge = '';
                  if (activeRoomOwnerId && member.uid === activeRoomOwnerId) {
                    badge = '@';
                  } else if (member.role === 'Admin') {
                    badge = '@';
                  } else if (member.role === 'Moderator') {
                    badge = '%';
                  }

                  return (
                    <div
                      key={member.uid}
                      onClick={() => setSelectedProfileCard(member)}
                      className={`group/item w-full text-left px-1 py-0.5 flex items-center justify-between cursor-pointer hover:bg-blue-800 hover:text-white rounded-sm select-none ${
                        isCurrent ? 'font-bold bg-slate-100 !text-black border border-slate-300' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {/* Dot indicator */}
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          member.status === 'away' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} title={member.status === 'away' ? 'Away' : 'Online'}></span>

                        <span className="truncate">
                          {badge && <span className="font-bold text-red-600 group-hover/item:text-yellow-300">{badge}</span>}
                          {member.nickname}
                        </span>
                      </div>

                      <div className="flex gap-1 items-center shrink-0">
                        {isFriend && <span className="text-[9px] text-green-700 bg-green-50 px-0.5 border border-green-200">F</span>}
                        {isBlocked && <span className="text-[9px] text-red-700 bg-red-50 px-0.5 border border-red-200">B</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Self Status Config bevel dropdown */}
            <div className="p-1.5 bg-[#dfdfdf] border-t border-t-white flex flex-col gap-1 shrink-0 select-none text-[10px]">
              <label className="font-mono font-bold text-gray-600">SET PRESENCE STATUS:</label>
              <select
                value={userProfile?.status || 'online'}
                onChange={handleStatusChange}
                className="w-full win95-inset bg-white text-xs px-1 py-0.5 outline-none font-bold font-mono text-blue-900 border"
              >
                <option value="online">Online</option>
                <option value="away">Away</option>
              </select>
            </div>
          </div>

        </div>

        {/* Nostalgic Windows 95 taskbar/footer */}
        <div className="h-[22px] bg-[#c0c0c0] border-t border-t-white p-1 px-3 flex items-center justify-between text-[10px] font-mono text-black select-none shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
            <span>SERVER PORT: <span className="font-bold text-emerald-800">3000</span></span>
          </div>

          <div className="flex gap-4">
            <span>MEMBERS ONLINE: <span className="font-bold">{allConnectedUsers.length}</span></span>
            <span>UTC TIME: <span className="font-bold">{new Date().toISOString().substring(11, 16)}</span></span>
          </div>
        </div>

      </div>

      {/* MODAL WINDOW 1: Create New room */}
      {showRoomCreate && (
        <RoomModal 
          onClose={() => setShowRoomCreate(false)}
          onCreate={handleCreateRoomSubmit}
        />
      )}

      {/* MODAL WINDOW 2: Help manual */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}

      {/* MODAL WINDOW 3: Enter PIN for protected rooms */}
      {pinProtectedRoom && (
        <RoomJoinModal 
          roomName={pinProtectedRoom.name}
          onClose={() => setPinProtectedRoom(null)}
          expectedPin={pinProtectedRoom.pin || ''}
          onSubmitPIN={() => handleJoinProtectedVerified(pinProtectedRoom)}
        />
      )}

      {/* MODAL WINDOW 4: Interactive Retro User Profile Card */}
      {selectedProfileCard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[280px] win95-outset p-[3px] text-black">
            <TitleBar 
              title={`Member Info - ${selectedProfileCard.nickname}`} 
              isDarkMode={isDarkMode}
              onClose={() => setSelectedProfileCard(null)} 
            />
            
            <div className="p-3 text-xs space-y-3 font-mono">
              <div className="flex items-start gap-3 bg-[#dfdfdf] p-2 border border-[#808080]">
                {/* Avatar SVG */}
                <div 
                  className="w-12 h-12 bg-black border border-black overflow-hidden shrink-0"
                  dangerouslySetInnerHTML={{ __html: getAvatarSvg(selectedProfileCard.avatar) }}
                />
                
                <div className="truncate flex-1 space-y-0.5">
                  <div className="font-black text-rose-800 truncate">@{selectedProfileCard.nickname}</div>
                  <div className="text-[10px] text-gray-500">Rank: <span className="font-bold text-black">{selectedProfileCard.role}</span></div>
                  <div className="text-[10px] text-gray-500">Joined: {new Date(selectedProfileCard.joinedAt).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedProfileCard.statusMessage && (
                <div className="p-1 px-2 border border-[#a0a0a0] bg-[#ffffdf] text-[10px] leading-tight">
                  <span className="font-bold italic">Away message:</span> &quot;{selectedProfileCard.statusMessage}&quot;
                </div>
              )}

              {/* Action Buttons inside member PFP card */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#a0a0a0]">
                {selectedProfileCard.uid !== currentUser.uid && (
                  <button
                    onClick={() => handleStartPrivateChat(selectedProfileCard)}
                    className="win95-outset py-1 text-[10px] font-bold text-center text-blue-900 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active"
                  >
                    💬 Message
                  </button>
                )}
                <button
                  onClick={() => {
                    handleFriendUserToggle(selectedProfileCard.uid);
                    setSelectedProfileCard(null);
                  }}
                  className="win95-outset py-1 text-[10px] hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active"
                >
                  {userProfile?.friends.includes(selectedProfileCard.uid) ? '✖ Unfriend' : '➕ Add Friend'}
                </button>
                <button
                  onClick={() => {
                    handleBlockUserToggle(selectedProfileCard.uid);
                    setSelectedProfileCard(null);
                  }}
                  className="win95-outset py-1 text-[10px] text-red-800 hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active"
                >
                  {userProfile?.blocked.includes(selectedProfileCard.uid) ? '✔ Unblock' : '🚫 Block'}
                </button>
                <button
                  onClick={() => setSelectedProfileCard(null)}
                  className="win95-outset py-1 text-[10px] hover:bg-[#dfdfdf] active:bg-[#a0a0a0] win95-btn-active"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
