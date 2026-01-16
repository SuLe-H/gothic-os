export enum AppView {
  HOME = 'HOME',
  CONTACT_LIST = 'CONTACT_LIST',
  USER_PROFILE_SETTINGS = 'USER_PROFILE_SETTINGS',
  CHAT = 'CHAT',
  CHAT_SETTINGS = 'CHAT_SETTINGS',
  WORLD_BOOK = 'WORLD_BOOK',
  SETTINGS = 'SETTINGS',
  FORUM_LIST = 'FORUM_LIST',
  FORUM_THREAD = 'FORUM_THREAD'
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  persona: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface Contact {
  id: string;
  name: string;
  avatarUrl: string;
  userName: string; 
  aiPersona: string;
  userPersona: string;
  backgroundUrl: string;
  bubbleCss: string;
  history: Message[];
  responseQueue: string[];
  isOfflineMode?: boolean; // Narrative/Action mode
  targetWordCount?: number; // Output length control
  linkedLoreIds?: string[]; // IDs of local world entries bound to this contact
  canAutoPost?: boolean; // Forum permission
  canAutoReply?: boolean; // Forum permission
}

export interface WorldEntry {
  id: string;
  title: string;
  content: string;
  active: boolean; // Master switch
  isGlobal?: boolean; // If true, applies to all. If false, must be linked.
}

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  showStatusBar: boolean;
  globalCss?: string;
}

export interface ForumComment {
  id: string;
  authorId: string; // 'user', 'random', or contactId
  authorName: string;
  avatarUrl?: string; // Optional, if linked to a contact
  content: string;
  timestamp: number;
  isPlayer?: boolean; // Deprecated in favor of checking authorId, but kept for compat
}

export interface ForumPost {
  id: string;
  authorId: string; // 'user' or contactId
  authorName: string;
  avatarUrl?: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  forwards: number;
  timestamp: number;
  comments: ForumComment[];
}

export interface ChatSession {
  messages: Message[];
}