export type UserRole = 'Admin' | 'Moderator' | 'Member';
export type UserStatus = 'online' | 'offline' | 'away';

export interface UserProfile {
  uid: string;
  nickname: string;
  email?: string;
  role: UserRole;
  joinedAt: number; // store as epoch ms for easy json/props handling
  status: UserStatus;
  statusMessage?: string;
  avatar: string; // designator (e.g. 'pfp_1', 'pfp_2')
  friends: string[]; // List of friend uids
  blocked: string[]; // List of blocked uids
  typingIn?: string; // channel id where user is typing
}

export interface Room {
  id: string;
  name: string;
  description: string;
  isProtected: boolean;
  pin?: string;
  ownerId: string;
  createdAt: number;
  memberCount: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  createdAt: number; // epoch ms
  isSystem?: boolean;
  type: 'text' | 'system' | 'me';
}

export interface Conversation {
  id: string; // sorted combination of participants (e.g. uid1_uid2)
  participants: string[]; // [uid1, uid2]
  updatedAt: number;
  lastMessage?: string;
}

export interface PrivateMessage {
  id: string;
  text: string;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  createdAt: number;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromNickname: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface ActiveTyping {
  nickname: string;
  timestamp: number;
}
