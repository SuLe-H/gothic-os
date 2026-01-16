import React, { useState, useEffect, useRef } from 'react';
import { MobileFrame } from './components/MobileFrame';
import { Icon } from './components/Icon';
import { AppView, Message, WorldEntry, AppSettings, Contact, ForumPost, ForumComment, UserProfile } from './types';
import { sendMessageToGemini, fetchModels, generateForumThread, generateForumReplies, generateBatchForumThreads } from './services/geminiService';

// --- INITIAL DATA ---

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  baseUrl: '',
  modelName: 'gemini-3-flash-preview',
  showStatusBar: true,
  globalCss: '',
};

const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Traveler',
  avatarUrl: '',
  persona: 'A mysterious traveler exploring this world.'
};

const INITIAL_WORLD_ENTRIES: WorldEntry[] = [];
const INITIAL_CONTACTS: Contact[] = [];

const INITIAL_FORUM_POSTS: ForumPost[] = [
    {
        id: '1',
        authorId: 'random',
        authorName: 'MidnightWhisper',
        title: '你们有没有觉得最近雾越来越浓了？',
        content: '我发誓早上它停留的时间更长了。感觉……很沉重。就像有什么东西在注视着我们。',
        tags: ['怪谈', '天气', '恐怖'],
        likes: 42,
        forwards: 5,
        timestamp: Date.now() - 1000000,
        comments: [
            { id: 'c1', authorId: 'random', authorName: 'Skeptic101', content: '只是季节变化而已，放松点。', timestamp: Date.now() - 900000 }
        ]
    },
    {
        id: '2',
        authorId: 'random',
        authorName: 'CafeLover',
        title: 'Dark Roast 的新拿铁简直绝了！',
        content: '有一丝香料南瓜的味道，还有……某种金属味？但出奇的好喝！',
        tags: ['美食', '生活', '安利'],
        likes: 128,
        forwards: 12,
        timestamp: Date.now() - 500000,
        comments: []
    }
];

// Helper to split text into sentences
const splitResponse = (text: string, isOfflineMode: boolean = false): string[] => {
  if (isOfflineMode) {
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.map(p => p.trim()).filter(p => p.length > 0);
  }
  const segments = text.match(/[^.!?。？！\n\r]+[.!?。？！\n\r]*/g);
  if (!segments) return [text];
  return segments.map(s => s.trim()).filter(s => s.length > 0);
};

// Helper to download JSON data
const downloadJson = (filename: string, data: any) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- SUB-COMPONENTS ---

// 1. HOME SCREEN
const HomeScreen = ({ onNavigate }: { onNavigate: (view: AppView) => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
      <div className="mb-12 text-center">
        <h1 className="font-header text-4xl text-[#c5a059] drop-shadow-md mb-2">Gothic OS</h1>
        <p className="font-display italic text-gray-500 text-sm">v.6.6.6 - Memento Mori</p>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-[300px]">
        <button 
          onClick={() => onNavigate(AppView.CONTACT_LIST)}
          className="flex flex-col items-center justify-center bg-neutral-900/50 border border-[#c5a059]/30 rounded-2xl p-6 aspect-square hover:bg-[#c5a059]/10 hover:border-[#c5a059] transition-all duration-300 group"
        >
          <div className="bg-gradient-to-br from-neutral-800 to-black p-4 rounded-full border border-neutral-700 group-hover:border-[#c5a059] shadow-lg mb-3">
             <Icon.Chat className="w-8 h-8 text-[#c5a059]" />
          </div>
          <span className="font-header text-sm tracking-widest text-neutral-400 group-hover:text-[#c5a059]">通讯<br/><span className="text-[10px] opacity-70">Commune</span></span>
        </button>

         <button 
          onClick={() => onNavigate(AppView.FORUM_LIST)}
          className="flex flex-col items-center justify-center bg-neutral-900/50 border border-purple-900/30 rounded-2xl p-6 aspect-square hover:bg-purple-900/10 hover:border-purple-500 transition-all duration-300 group"
        >
           <div className="bg-gradient-to-br from-neutral-800 to-black p-4 rounded-full border border-neutral-700 group-hover:border-purple-500 shadow-lg mb-3">
             <Icon.Users className="w-8 h-8 text-purple-500" />
          </div>
          <span className="font-header text-sm tracking-widest text-neutral-400 group-hover:text-purple-500">论坛<br/><span className="text-[10px] opacity-70">Forum</span></span>
        </button>

        <button 
          onClick={() => onNavigate(AppView.WORLD_BOOK)}
          className="flex flex-col items-center justify-center bg-neutral-900/50 border border-[#7f1d1d]/30 rounded-2xl p-6 aspect-square hover:bg-[#7f1d1d]/10 hover:border-[#7f1d1d] transition-all duration-300 group"
        >
           <div className="bg-gradient-to-br from-neutral-800 to-black p-4 rounded-full border border-neutral-700 group-hover:border-[#7f1d1d] shadow-lg mb-3">
             <Icon.Book className="w-8 h-8 text-[#7f1d1d]" />
          </div>
          <span className="font-header text-sm tracking-widest text-neutral-400 group-hover:text-[#7f1d1d]">世界书<br/><span className="text-[10px] opacity-70">Grimoire</span></span>
        </button>

        <button 
          onClick={() => onNavigate(AppView.SETTINGS)}
          className="flex flex-col items-center justify-center bg-neutral-900/50 border border-neutral-600/30 rounded-2xl p-6 aspect-square hover:bg-neutral-800/50 hover:border-neutral-400 transition-all duration-300 group"
        >
           <div className="bg-gradient-to-br from-neutral-800 to-black p-4 rounded-full border border-neutral-700 group-hover:border-neutral-400 shadow-lg mb-3">
             <Icon.Settings className="w-8 h-8 text-neutral-400" />
          </div>
          <span className="font-header text-sm tracking-widest text-neutral-400 group-hover:text-neutral-200">系统<br/><span className="text-[10px] opacity-70">Config</span></span>
        </button>
      </div>
    </div>
  );
};

// 2. CONTACT LIST SCREEN
const ContactListScreen = ({ 
  contacts, 
  onSelectContact, 
  onAddContact,
  onOpenUserProfile,
  onBack 
}: { 
  contacts: Contact[], 
  onSelectContact: (id: string) => void,
  onAddContact: () => void,
  onOpenUserProfile: () => void,
  onBack: () => void
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
       <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-black/50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-neutral-400 hover:text-white" aria-label="Back">
            <Icon.ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-header text-[#c5a059] text-xl tracking-wider">联系人 <span className="text-sm text-neutral-500 ml-1">Contacts</span></h2>
        </div>
        <button onClick={onAddContact} className="text-[#c5a059] hover:text-white" aria-label="Add Contact">
          <Icon.Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600">
            <p className="font-display italic">虚空之中空无一物...</p>
            <p className="text-xs mt-2">点击右上角召唤伙伴</p>
          </div>
        ) : (
          contacts.map(contact => (
            <button 
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className="w-full flex items-center gap-4 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 hover:border-[#c5a059]/50 transition-all"
            >
              <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700 overflow-hidden shrink-0">
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon.User className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-header text-neutral-200 truncate">{contact.name}</h3>
                <p className="text-xs text-neutral-500 truncate">{contact.history.length > 0 ? contact.history[contact.history.length - 1].content : "暂无消息..."}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* "Me" Button at the bottom */}
      <div className="p-4 bg-black/50 border-t border-neutral-800">
        <button 
          onClick={onOpenUserProfile}
          className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] border border-neutral-700 text-neutral-300 py-4 rounded-xl hover:bg-[#c5a059]/10 hover:border-[#c5a059] hover:text-[#c5a059] transition-all group"
        >
          <Icon.User className="w-5 h-5 text-neutral-500 group-hover:text-[#c5a059]" />
          <span className="font-header text-sm tracking-widest">我 (Me)</span>
        </button>
      </div>
    </div>
  );
};

// 3. USER PROFILE SCREEN
const UserProfileScreen = ({ profile, onUpdate, onBack }: { profile: UserProfile, onUpdate: (p: UserProfile) => void, onBack: () => void }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
           onUpdate({...profile, avatarUrl: reader.result});
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex items-center gap-3 p-4 border-b border-neutral-800 bg-black/50">
        <button onClick={onBack} className="text-neutral-400 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
        <h2 className="font-header text-[#c5a059] text-xl">用户档案 <span className="text-sm text-neutral-500">Profile</span></h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         {/* Avatar Config */}
         <div className="flex flex-col items-center gap-4 py-4">
             <div className="w-24 h-24 rounded-full border border-neutral-700 bg-neutral-900 overflow-hidden relative group">
                 {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Icon.User className="w-8 h-8 text-neutral-600"/></div>}
                 <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-[10px] text-white">UPLOAD</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                 </label>
             </div>
             <p className="text-[10px] text-neutral-500">点击图片上传 (Click image to upload)</p>
         </div>

         <div className="space-y-2">
            <label className="text-xs text-[#c5a059] uppercase tracking-widest font-header">名称 (Name)</label>
            <input 
              value={profile.name}
              onChange={e => onUpdate({...profile, name: e.target.value})}
              className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-[#c5a059] outline-none font-display"
              placeholder="Your Global Name"
            />
         </div>
         
         <div className="space-y-2">
            <label className="text-xs text-[#c5a059] uppercase tracking-widest font-header">全局人设 (Default Persona)</label>
             <textarea 
              value={profile.persona}
              onChange={e => onUpdate({...profile, persona: e.target.value})}
              className="w-full h-48 bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-[#c5a059] outline-none font-display resize-none"
              placeholder="Describe yourself..."
            />
             <p className="text-[10px] text-neutral-500">此人设将作为所有聊天和论坛发帖的默认设置。</p>
         </div>
      </div>
    </div>
  );
};

// 4. CHAT SCREEN (Unchanged visually, logic will use profile)
const ChatScreen = ({ contact, onSend, onBack, onSettings, isTyping }: { contact: Contact, onSend: (text: string) => void, onBack: () => void, onSettings: () => void, isTyping: boolean }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [contact.history, isTyping]);

  const handleSend = () => {
    onSend(input);
    setInput("");
  };

  const hasPendingResponse = contact.responseQueue.length > 0;
  const showNextAction = input.trim().length === 0;

  return (
    <div className="flex flex-col h-full bg-black/90" style={contact.backgroundUrl ? { backgroundImage: `url(${contact.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/70 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden border border-white/20">
                {contact.avatarUrl && <img src={contact.avatarUrl} className="w-full h-full object-cover" />}
             </div>
             <div>
                <h2 className="font-header text-white text-sm tracking-wider">{contact.name}</h2>
                {contact.isOfflineMode && <span className="text-[9px] text-[#c5a059] border border-[#c5a059] px-1 rounded bg-[#c5a059]/20">STORY MODE</span>}
             </div>
          </div>
        </div>
        <button onClick={onSettings} className="text-white/70 hover:text-white"><Icon.Settings className="w-5 h-5" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 backdrop-blur-sm" ref={scrollRef}>
        {contact.history.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-[#c5a059] text-black rounded-tr-none' : 'bg-neutral-800/90 text-neutral-200 rounded-tl-none border border-white/10'}`} style={!isUser && contact.bubbleCss ? JSON.parse(contact.bubbleCss || '{}') : {}}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
           <div className="flex justify-start animate-pulse">
              <div className="bg-neutral-800/50 text-neutral-400 rounded-2xl rounded-tl-none p-3 text-xs">
                 Writing...
              </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center gap-2">
         <textarea 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={contact.isOfflineMode ? (hasPendingResponse ? "点击发送继续剧情..." : "输入行动...") : "发送消息..."}
            className="flex-1 bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#c5a059]/50 outline-none resize-none h-12 font-display"
            onKeyDown={e => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
         />
         <button 
           onClick={handleSend}
           disabled={isTyping} 
           className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${input.trim().length === 0 ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-[#c5a059] text-black hover:bg-[#d4b06a]'}`}
         >
            {hasPendingResponse && showNextAction ? <Icon.MoreVertical className="w-5 h-5 animate-pulse" /> : <Icon.Send className="w-5 h-5" />}
         </button>
      </div>
    </div>
  );
};

// 5. CHAT SETTINGS SCREEN
const ChatSettingsScreen = ({ contact, onUpdate, onDelete, onBack }: { contact: Contact, onUpdate: (c: Contact) => void, onDelete: () => void, onBack: () => void }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'backgroundUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
           onUpdate({...contact, [field]: reader.result});
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    const filename = `chat_${contact.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    downloadJson(filename, contact.history);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
       <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-black/50">
        <button onClick={onBack} className="text-neutral-400 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
        <h2 className="font-header text-[#c5a059] text-xl">设置 (Settings)</h2>
        <button onClick={onDelete} className="text-red-900 hover:text-red-500"><Icon.Trash className="w-5 h-5" /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
         {/* Identity */}
         <div className="space-y-4 border-b border-neutral-800 pb-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">身份 (Identity)</h3>
            <div>
                <label className="text-[10px] text-neutral-400">名称 (Name)</label>
                <input 
                  value={contact.name} onChange={e => onUpdate({...contact, name: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059]"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <label className="block p-3 border border-neutral-800 rounded bg-neutral-900 text-center cursor-pointer hover:border-[#c5a059]">
                    <span className="text-xs text-neutral-400">上传头像 (Avatar)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatarUrl')} />
                </label>
                 <label className="block p-3 border border-neutral-800 rounded bg-neutral-900 text-center cursor-pointer hover:border-[#c5a059]">
                    <span className="text-xs text-neutral-400">上传背景 (BG)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'backgroundUrl')} />
                </label>
            </div>
         </div>

         {/* Personas */}
         <div className="space-y-4 border-b border-neutral-800 pb-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">灵魂与契约 (Soul & Pact)</h3>
            <div>
                 <label className="text-[10px] text-[#c5a059] block mb-1">AI 人设 (AI Persona)</label>
                 <textarea 
                  value={contact.aiPersona} onChange={e => onUpdate({...contact, aiPersona: e.target.value})}
                  className="w-full h-32 bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059] resize-none font-display"
                />
            </div>
            <div>
                 <label className="text-[10px] text-neutral-400 block mb-1">用户名称 (User Name) - 可选</label>
                 <input 
                  value={contact.userName} onChange={e => onUpdate({...contact, userName: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059]"
                  placeholder="留空则使用全局档案"
                />
            </div>
            <div>
                 <label className="text-[10px] text-neutral-400 block mb-1">用户人设 (User Persona) - 可选</label>
                 <textarea 
                  value={contact.userPersona} onChange={e => onUpdate({...contact, userPersona: e.target.value})}
                  className="w-full h-24 bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059] resize-none font-display"
                  placeholder="留空则使用全局档案"
                />
            </div>
         </div>

         {/* Mode Settings */}
         <div className="space-y-4 border-b border-neutral-800 pb-6">
             <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">模式控制 (Mode Control)</h3>
             
             <div className="flex items-center justify-between bg-neutral-900 p-3 rounded border border-neutral-800">
                 <span className="text-sm text-neutral-300">线下模式 (Narrative / Offline Mode)</span>
                 <button 
                    onClick={() => onUpdate({...contact, isOfflineMode: !contact.isOfflineMode})}
                    className={`w-10 h-6 rounded-full relative transition-colors ${contact.isOfflineMode ? 'bg-[#c5a059]' : 'bg-neutral-700'}`}
                 >
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${contact.isOfflineMode ? 'left-5' : 'left-1'}`} />
                 </button>
             </div>
             
              {contact.isOfflineMode && (
                <div className="animate-fade-in">
                     <label className="text-[10px] text-neutral-400 block mb-1">目标字数 (Target Word Count) (0 for auto)</label>
                     <input 
                      type="number"
                      value={contact.targetWordCount || 0} onChange={e => onUpdate({...contact, targetWordCount: parseInt(e.target.value)})}
                      className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059]"
                    />
                </div>
              )}
         </div>

         {/* Visuals */}
         <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">视觉 (Visuals)</h3>
            <div>
                <label className="text-[10px] text-neutral-400 block mb-1">气泡样式 (Bubble CSS)</label>
                <textarea 
                  value={contact.bubbleCss} 
                  onChange={e => onUpdate({...contact, bubbleCss: e.target.value})}
                  className="w-full h-24 bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-xs font-mono focus:border-[#c5a059] resize-none"
                  placeholder=".bubble-model { color: red; }"
                />
            </div>
         </div>

         {/* Export */}
         <div className="space-y-4 pt-4 border-t border-neutral-800">
           <button 
             onClick={handleExport}
             className="w-full bg-neutral-900 text-[#c5a059] border border-[#c5a059]/30 font-header py-3 rounded hover:bg-[#c5a059]/10 transition-colors"
           >
             导出聊天记录 (Export Chat History)
           </button>
         </div>
      </div>
    </div>
  );
};

// 6. WORLD BOOK SCREEN
const WorldBookScreen = ({ entries, contacts, onUpdateContacts, onBack, onUpdateEntries }: { entries: WorldEntry[], contacts: Contact[], onUpdateContacts: (c: Contact[]) => void, onBack: () => void, onUpdateEntries: (e: WorldEntry[]) => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [bindingLoreId, setBindingLoreId] = useState<string | null>(null);

  const handleSave = () => {
    if (editingId) {
        if (editingId !== "new") {
           onUpdateEntries(entries.map(e => e.id === editingId ? { ...e, title: editTitle, content: editContent } : e));
        } else {
           const newEntry: WorldEntry = {
              id: Date.now().toString(),
              title: editTitle || "New Entry",
              content: editContent,
              active: true,
              isGlobal: false
           };
           onUpdateEntries([...entries, newEntry]);
        }
        setEditingId(null);
    }
    setEditTitle("");
    setEditContent("");
  };

  const startEdit = (entry?: WorldEntry) => {
      if (entry) {
          setEditingId(entry.id);
          setEditTitle(entry.title);
          setEditContent(entry.content);
      } else {
          setEditingId("new");
          setEditTitle("");
          setEditContent("");
      }
  };

  const toggleGlobal = (id: string) => {
      onUpdateEntries(entries.map(e => e.id === id ? { ...e, isGlobal: !e.isGlobal } : e));
  };
  
  const toggleActive = (id: string) => {
      onUpdateEntries(entries.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const handleDelete = (id: string) => {
      onUpdateEntries(entries.filter(e => e.id !== id));
      if (editingId === id) setEditingId(null);
  };
  
  const toggleLink = (entryId: string, contactId: string) => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;
      
      const currentLinks = contact.linkedLoreIds || [];
      const isLinked = currentLinks.includes(entryId);
      
      let newLinks;
      if (isLinked) {
          newLinks = currentLinks.filter(id => id !== entryId);
      } else {
          newLinks = [...currentLinks, entryId];
      }
      
      const updatedContact = { ...contact, linkedLoreIds: newLinks };
      onUpdateContacts(contacts.map(c => c.id === contactId ? updatedContact : c));
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
       <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-black/50">
        <button onClick={onBack} className="text-neutral-400 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
        <h2 className="font-header text-[#7f1d1d] text-xl tracking-widest">世界书 (Grimoire)</h2>
        <button onClick={() => startEdit()} className="text-[#7f1d1d] hover:text-red-400"><Icon.Plus className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {editingId ? (
            <div className="bg-neutral-900 border border-[#7f1d1d]/50 p-4 rounded-xl space-y-4 animate-fade-in">
                <input 
                  value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title"
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded text-[#7f1d1d] font-bold"
                />
                <textarea 
                   value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Lore content..."
                   className="w-full h-48 bg-neutral-950 border border-neutral-800 p-2 rounded text-neutral-300 text-sm resize-none font-display"
                />
                <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-neutral-800 py-2 rounded text-neutral-400">Cancel</button>
                    <button onClick={handleSave} className="flex-1 bg-[#7f1d1d] py-2 rounded text-black font-bold">Save</button>
                </div>
            </div>
        ) : null}

        {entries.map(entry => (
            <div key={entry.id} className={`bg-neutral-900/50 border ${entry.active ? 'border-[#7f1d1d]/40' : 'border-neutral-800 opacity-60'} p-4 rounded-xl transition-all`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => toggleActive(entry.id)} 
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${entry.active ? 'bg-[#7f1d1d] border-[#7f1d1d]' : 'bg-transparent border-red-900'}`}
                            title="Toggle Active"
                         >
                            {!entry.active && <div className="w-2 h-2 bg-red-900 rounded-full" />}
                         </button>
                         <span className={`font-header ${entry.active ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>
                            {entry.title}
                         </span>
                         {!entry.active && <span className="text-[10px] text-red-500 border border-red-900/30 bg-red-900/10 px-1 rounded ml-2">未生效 (Inactive)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => startEdit(entry)} className="text-neutral-500 hover:text-white"><Icon.Feather className="w-4 h-4" /></button>
                         <button onClick={() => handleDelete(entry.id)} className="text-neutral-500 hover:text-red-500"><Icon.Trash className="w-4 h-4" /></button>
                    </div>
                </div>
                
                {/* Visual indicator of scope */}
                <div className="flex items-center gap-2 mb-2">
                   {entry.isGlobal ? (
                       <span className="text-[9px] uppercase tracking-widest text-[#c5a059] border border-[#c5a059]/30 px-1.5 rounded">Global</span>
                   ) : (
                       <span className="text-[9px] uppercase tracking-widest text-neutral-500 border border-neutral-800 px-1.5 rounded">Local</span>
                   )}
                </div>

                <p className="text-xs text-neutral-500 line-clamp-3 mb-3 font-display">{entry.content}</p>
                
                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/50">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">Apply Globally?</span>
                        <button 
                            onClick={() => toggleGlobal(entry.id)}
                            className={`w-8 h-4 rounded-full relative transition-colors ${entry.isGlobal ? 'bg-[#c5a059]' : 'bg-neutral-800'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${entry.isGlobal ? 'left-4.5' : 'left-0.5'}`} style={{ left: entry.isGlobal ? 'calc(100% - 14px)' : '2px'}}/>
                        </button>
                    </div>
                    
                    {!entry.isGlobal && (
                        <div className="mt-1 flex justify-between items-center">
                            <span className="text-[10px] text-neutral-400">Bound to:</span>
                            <button 
                                onClick={() => setBindingLoreId(entry.id)}
                                className="text-[10px] bg-neutral-800 border border-neutral-700 hover:border-[#c5a059] hover:text-[#c5a059] px-2 py-1 rounded transition-colors flex items-center gap-1"
                            >
                                <Icon.Users className="w-3 h-3" /> Select Contacts
                            </button>
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>
      
      {bindingLoreId && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm p-6 flex flex-col animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-header text-[#c5a059] text-lg">Bind to Contacts</h3>
                  <button onClick={() => setBindingLoreId(null)}><Icon.X className="w-6 h-6 text-neutral-500 hover:text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                  {contacts.length === 0 && <p className="text-neutral-500 text-sm">No contacts available.</p>}
                  {contacts.map(c => {
                      const isLinked = (c.linkedLoreIds || []).includes(bindingLoreId);
                      return (
                          <button
                            key={c.id}
                            onClick={() => toggleLink(bindingLoreId, c.id)}
                            className={`w-full flex items-center justify-between p-4 rounded border transition-colors ${isLinked ? 'bg-[#7f1d1d]/20 border-[#7f1d1d]' : 'bg-neutral-900 border-neutral-800'}`}
                          >
                              <span className={`font-header ${isLinked ? 'text-[#c5a059]' : 'text-neutral-400'}`}>{c.name}</span>
                              {isLinked ? <Icon.Check className="w-5 h-5 text-[#c5a059]" /> : <div className="w-5 h-5 border border-neutral-600 rounded" />}
                          </button>
                      );
                  })}
              </div>
              <button onClick={() => setBindingLoreId(null)} className="mt-4 w-full bg-[#7f1d1d] text-white py-3 rounded font-header">Done</button>
          </div>
      )}
    </div>
  );
};

// 7. SETTINGS SCREEN
const SettingsScreen = ({ settings, contacts, worldEntries, onUpdateSettings, onBack }: { settings: AppSettings, contacts: Contact[], worldEntries: WorldEntry[], onUpdateSettings: (s: AppSettings) => void, onBack: () => void }) => {
  const [modelLoading, setModelLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [formData, setFormData] = useState(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusBarToggle = () => {
    const newValue = !formData.showStatusBar;
    handleChange('showStatusBar', newValue);
    onUpdateSettings({ ...formData, showStatusBar: newValue });
  };

  const handleSave = () => {
    onUpdateSettings(formData);
    onBack();
  };

  const handleFetchModels = async () => {
      setModelLoading(true);
      try {
          const models = await fetchModels(formData);
          setAvailableModels(models);
          setShowModelPicker(true);
      } catch (e) {
          alert("Failed to fetch models. Check API Key.");
      } finally {
          setModelLoading(false);
      }
  };

  const handleExport = () => {
      const exportData = {
          version: 1,
          date: new Date().toISOString(),
          settings: formData,
          contacts,
          worldEntries
      };
      downloadJson("gothic_os_backup.json", exportData);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex items-center gap-3 p-4 border-b border-neutral-800 bg-black/50">
        <button onClick={onBack} className="text-neutral-400 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
        <h2 className="font-header text-[#c5a059] text-xl">系统设置 <span className="text-sm text-neutral-500">Config</span></h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* API Config - SWAPPED ORDER */}
          <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#c5a059] uppercase border-b border-neutral-800 pb-2 tracking-widest">连接 (Connection)</h3>
              <div className="space-y-2">
                  <label className="text-xs text-neutral-400">基础链接 (Base URL) - 可选</label>
                  <input 
                    value={formData.baseUrl}
                    onChange={e => handleChange('baseUrl', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059] font-mono"
                    placeholder="https://..."
                  />
              </div>
              <div className="space-y-2">
                  <label className="text-xs text-neutral-400">API 密钥 (Gemini API Key)</label>
                  <div className="relative">
                      <input 
                        type="password"
                        value={formData.apiKey}
                        onChange={e => handleChange('apiKey', e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm focus:border-[#c5a059] pr-10 font-mono"
                        placeholder="AIza..."
                      />
                  </div>
              </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#c5a059] uppercase border-b border-neutral-800 pb-2 tracking-widest">模型 (Model)</h3>
              <div className="flex gap-2">
                  <input 
                    value={formData.modelName}
                    onChange={e => handleChange('modelName', e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm font-mono"
                    placeholder="gemini-3-flash-preview"
                  />
                  <button 
                    onClick={handleFetchModels} 
                    disabled={modelLoading}
                    className="bg-neutral-800 px-4 rounded text-xs text-neutral-400 hover:bg-neutral-700 border border-neutral-700"
                  >
                      {modelLoading ? '...' : '获取 (Fetch)'}
                  </button>
              </div>
              {showModelPicker && availableModels.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded p-2 max-h-40 overflow-y-auto grid grid-cols-1 gap-1">
                      {availableModels.map(m => (
                          <button 
                            key={m} 
                            onClick={() => { handleChange('modelName', m); setShowModelPicker(false); }}
                            className="text-left text-xs text-neutral-400 hover:text-[#c5a059] hover:bg-neutral-800 p-2 rounded font-mono"
                          >
                              {m}
                          </button>
                      ))}
                  </div>
              )}
          </div>

          {/* Misc Settings */}
          <div className="space-y-4">
               <h3 className="text-xs font-bold text-[#c5a059] uppercase border-b border-neutral-800 pb-2 tracking-widest">其他 (Misc)</h3>
               <div className="flex items-center justify-between">
                   <span className="text-sm text-neutral-300">显示状态栏 (Show Status Bar)</span>
                   <button 
                     onClick={handleStatusBarToggle}
                     className={`w-10 h-5 rounded-full relative transition-colors ${formData.showStatusBar ? 'bg-[#c5a059]' : 'bg-neutral-700'}`}
                   >
                       <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.showStatusBar ? 'left-6' : 'left-1'}`} />
                   </button>
               </div>
               <div className="space-y-2 mt-4">
                  <label className="text-xs text-neutral-400">全局样式 (Global CSS)</label>
                  <textarea 
                    value={formData.globalCss || ''}
                    onChange={(e) => handleChange('globalCss', e.target.value)}
                    className="w-full h-24 bg-neutral-900 border border-neutral-800 p-3 rounded text-xs font-mono text-neutral-300 focus:border-[#c5a059] outline-none resize-none"
                    placeholder="body { ... }"
                  />
              </div>
          </div>

          {/* Data */}
          <div className="space-y-4">
               <h3 className="text-xs font-bold text-[#c5a059] uppercase border-b border-neutral-800 pb-2 tracking-widest">数据管理 (Data)</h3>
               <button 
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 border border-[#c5a059]/30 p-3 rounded text-[#c5a059] hover:bg-[#c5a059]/10 transition-colors"
               >
                   <Icon.Check className="w-4 h-4" /> 导出备份 (Export Backup)
               </button>
          </div>

          <div className="p-4 bg-black/50 border-t border-neutral-800">
            <button 
              onClick={handleSave}
              className="w-full bg-[#c5a059] text-black font-header font-bold py-3 rounded hover:bg-[#d6b068] transition-colors"
            >
              保存配置 (Save Configuration)
            </button>
          </div>
      </div>
    </div>
  );
};

// --- NEW FORUM SCREENS ---

const ForumListScreen = ({ 
    posts, 
    contacts, 
    worldEntries, 
    settings,
    userProfile,
    onSelectPost, 
    onAddPost, 
    onUpdateContacts,
    onBack 
}: { 
    posts: ForumPost[], 
    contacts: Contact[], 
    worldEntries: WorldEntry[],
    settings: AppSettings,
    userProfile: UserProfile,
    onSelectPost: (id: string) => void, 
    onAddPost: (post: ForumPost) => void,
    onUpdateContacts: (contacts: Contact[]) => void,
    onBack: () => void 
}) => {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    // Modals
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    // Post Generation State
    const [postTitle, setPostTitle] = useState("");
    const [postContent, setPostContent] = useState("");
    const [postTags, setPostTags] = useState("");
    const [isSimulating, setIsSimulating] = useState(false);

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));
    const filteredPosts = selectedTag ? posts.filter(p => p.tags.includes(selectedTag)) : posts;

    // Manual User Post (Post as Me)
    const handleUserPost = () => {
        if (!postTitle.trim() || !postContent.trim()) return alert("Title and Content required.");

        const newPost: ForumPost = {
            id: Date.now().toString(),
            authorId: 'user',
            authorName: userProfile.name,
            avatarUrl: userProfile.avatarUrl,
            title: postTitle,
            content: postContent,
            tags: postTags.split(',').map(t => t.trim()).filter(Boolean),
            likes: 0,
            forwards: 0,
            timestamp: Date.now(),
            comments: []
        };
        onAddPost(newPost);
        setIsPostModalOpen(false);
        setPostTitle("");
        setPostContent("");
        setPostTags("");
    };

    // Auto Simulation (NPC Post) - UPDATED TO BATCH
    const handleSimulateThread = async () => {
        if (!settings.apiKey) return alert("Please set API Key first.");
        
        setIsSimulating(true);
        try {
            // Use batch generation, filtering by selectedTag if present
            const newThreads = await generateBatchForumThreads(selectedTag, contacts, worldEntries, settings);
            
            if (newThreads && newThreads.length > 0) {
                // Add threads in reverse order so they appear at the top but maintain relative order
                // Actually usually newer on top, so let's iterate and add.
                // The parent's onAddPost adds to the TOP (setForumPosts([p, ...prev])).
                // So if we get [A, B, C], and we add them one by one, we want them to show up.
                // Let's add them all.
                
                // We need to map the raw JSON response to ForumPost objects
                newThreads.forEach((threadData: any, index: number) => {
                    // Find author if possible
                    const authorContact = contacts.find(c => c.name === threadData.authorName);
                    
                    const newPost: ForumPost = {
                        id: `${Date.now()}-${index}`,
                        authorId: authorContact ? authorContact.id : 'random',
                        authorName: threadData.authorName || "Anonymous",
                        avatarUrl: authorContact?.avatarUrl,
                        title: threadData.title || "Untitled",
                        content: threadData.content || "...",
                        tags: threadData.tags || [],
                        likes: Math.floor(Math.random() * 50),
                        forwards: Math.floor(Math.random() * 10),
                        timestamp: Date.now() + (index * 1000), // Slight offset
                        comments: Array.isArray(threadData.comments) ? threadData.comments.map((c: any, cIdx: number) => {
                             const cAuthor = contacts.find(contact => contact.name === c.authorName);
                             return {
                                 id: `c-${Date.now()}-${index}-${cIdx}`,
                                 authorId: cAuthor ? cAuthor.id : 'random',
                                 authorName: c.authorName,
                                 avatarUrl: cAuthor?.avatarUrl,
                                 content: c.content,
                                 timestamp: Date.now() + (index * 1000) + (cIdx * 500)
                             } as ForumComment;
                        }) : []
                    };
                    onAddPost(newPost);
                });
                alert(`生成成功 (Generated ${newThreads.length} threads)`);
            } else {
                alert("生成无响应 (No threads generated)");
            }
        } catch (e) {
            console.error(e);
            alert("生成失败 (Simulation Failed)");
        } finally {
            setIsSimulating(false);
        }
    };

    const togglePermission = (id: string, field: 'canAutoPost' | 'canAutoReply') => {
        const updated = contacts.map(c => {
            if (c.id === id) {
                return { ...c, [field]: !c[field] };
            }
            return c;
        });
        onUpdateContacts(updated);
    };

    return (
        <div className="flex h-full bg-[#121212]">
            {/* Main Feed */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-purple-900/30 bg-black/50 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="text-neutral-400 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
                        <h2 className="font-header text-purple-400 text-lg tracking-wider">暗网论坛 (ShadowNet)</h2>
                    </div>
                    <div className="flex gap-2">
                        {/* Simulate Button */}
                        <button 
                            onClick={handleSimulateThread} 
                            disabled={isSimulating}
                            className={`p-1.5 rounded border ${isSimulating ? 'bg-purple-900 text-white animate-pulse' : 'text-purple-400 border-purple-900/50 bg-purple-900/20 hover:text-white'}`}
                            title="Simulate Event"
                        >
                            <Icon.Sliders className="w-5 h-5 rotate-90" />
                        </button>
                        
                        {/* Settings Button */}
                         <button 
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="p-1.5 rounded border text-purple-400 border-purple-900/50 bg-purple-900/20 hover:text-white"
                            title="Forum Settings"
                        >
                            <Icon.Sliders className="w-5 h-5" />
                        </button>

                        {/* New Thread Button - REPLACED WITH MODAL TRIGGER */}
                        <button 
                            onClick={() => setIsPostModalOpen(true)} 
                            className="p-1.5 rounded border text-purple-400 border-purple-900/50 bg-purple-900/20 hover:text-white flex items-center gap-1 font-bold px-3"
                        >
                            <Icon.Plus className="w-4 h-4"/>
                            <span className="text-xs">发帖 (Post)</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {filteredPosts.map(post => (
                        <div key={post.id} onClick={() => onSelectPost(post.id)} className="bg-neutral-900/50 border border-neutral-800 hover:border-purple-500/50 p-4 rounded-xl cursor-pointer transition-all">
                             <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                                         {post.avatarUrl ? <img src={post.avatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">?</div>}
                                     </div>
                                     <span className="text-xs text-neutral-400 font-bold">{post.authorName}</span>
                                     <span className="text-[10px] text-neutral-600">• {new Date(post.timestamp).toLocaleTimeString()}</span>
                                 </div>
                             </div>
                             <h3 className="font-header text-neutral-200 text-sm mb-1">{post.title}</h3>
                             <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{post.content}</p>
                             
                             {/* Stats Row */}
                             <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
                                 <div className="flex gap-2 flex-wrap">
                                     {post.tags.map(t => (
                                         <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">#{t}</span>
                                     ))}
                                 </div>
                                 <div className="flex items-center gap-4 text-neutral-500 text-[10px]">
                                     <span className="flex items-center gap-1">点赞 {post.likes}</span>
                                     <span className="flex items-center gap-1">评论 {post.comments.length}</span>
                                     <span className="flex items-center gap-1">转发 {post.forwards || 0}</span>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Tag Sidebar */}
            <div className="w-16 border-l border-neutral-900 bg-black/20 flex flex-col items-center py-4 space-y-4 overflow-y-auto">
                <button 
                  onClick={() => setSelectedTag(null)} 
                  className={`p-2 rounded-lg ${!selectedTag ? 'bg-purple-900 text-white' : 'text-neutral-500'}`}
                >
                    <Icon.Globe className="w-5 h-5"/>
                </button>
                {allTags.map(tag => (
                     <button 
                       key={tag}
                       onClick={() => setSelectedTag(tag === selectedTag ? null : tag)} 
                       className={`text-[10px] [writing-mode:vertical-rl] py-2 px-1 rounded hover:text-purple-400 transition-colors ${selectedTag === tag ? 'text-purple-400 font-bold border-r-2 border-purple-400' : 'text-neutral-600'}`}
                     >
                         {tag}
                     </button>
                ))}
            </div>

            {/* Post Thread Modal - USER EDIT */}
            {isPostModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm p-6 flex flex-col animate-fade-in">
                    <h3 className="font-header text-purple-400 text-xl mb-6">发布新帖 (New Thread)</h3>
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2 mb-4 p-2 bg-neutral-900 rounded">
                             <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-700">
                                 {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} className="w-full h-full object-cover"/> : <Icon.User className="w-full h-full p-1 text-neutral-500"/>}
                             </div>
                             <span className="text-sm text-neutral-300">Posting as: {userProfile.name}</span>
                        </div>

                        <div>
                            <input 
                                value={postTitle}
                                onChange={e => setPostTitle(e.target.value)}
                                placeholder="标题 (Title)..."
                                className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <textarea 
                                value={postContent}
                                onChange={e => setPostContent(e.target.value)}
                                placeholder="内容 (Content)..."
                                className="w-full h-48 bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm outline-none resize-none focus:border-purple-500"
                            />
                        </div>
                         <div>
                            <input 
                                value={postTags}
                                onChange={e => setPostTags(e.target.value)}
                                placeholder="标签 (Tags) - comma separated"
                                className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-neutral-200 text-sm outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                         <button onClick={() => setIsPostModalOpen(false)} className="flex-1 bg-neutral-800 py-3 rounded text-neutral-400">取消 (Cancel)</button>
                         <button onClick={handleUserPost} className="flex-1 bg-purple-900 hover:bg-purple-700 py-3 rounded text-white font-bold">
                             发布 (Post)
                         </button>
                    </div>
                </div>
            )}

            {/* Forum Settings Modal */}
            {isSettingsModalOpen && (
                 <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm p-6 flex flex-col animate-fade-in">
                    <h3 className="font-header text-purple-400 text-xl mb-4">论坛权限设置 (Forum Settings)</h3>
                    <p className="text-xs text-neutral-500 mb-4">Choose which contacts can act autonomously.</p>
                    
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {contacts.length === 0 && <p className="text-neutral-500">No contacts.</p>}
                        {contacts.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 border border-neutral-800 rounded bg-neutral-900">
                                <span className="text-sm text-neutral-300 font-header">{c.name}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => togglePermission(c.id, 'canAutoPost')}
                                        className={`px-2 py-1 text-[10px] rounded border ${c.canAutoPost ? 'bg-purple-900 border-purple-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}
                                    >
                                        Auto-Post
                                    </button>
                                    <button 
                                        onClick={() => togglePermission(c.id, 'canAutoReply')}
                                        className={`px-2 py-1 text-[10px] rounded border ${c.canAutoReply ? 'bg-purple-900 border-purple-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}
                                    >
                                        Auto-Reply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-800">
                        <button onClick={() => setIsSettingsModalOpen(false)} className="w-full bg-neutral-800 py-3 rounded text-neutral-400">关闭 (Close)</button>
                    </div>
                 </div>
            )}
        </div>
    );
};

const ForumThreadScreen = ({
    post,
    contacts,
    worldEntries,
    settings,
    onBack,
    onUpdatePost,
    userProfile
}: {
    post: ForumPost,
    contacts: Contact[],
    worldEntries: WorldEntry[],
    settings: AppSettings,
    onBack: () => void,
    onUpdatePost: (p: ForumPost) => void,
    userProfile: UserProfile
}) => {
    const [replyInput, setReplyInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleUserReply = () => {
        if (!replyInput.trim()) return;
        const newComment: ForumComment = {
            id: Date.now().toString(),
            authorId: 'user',
            authorName: userProfile.name, // Use global profile
            avatarUrl: userProfile.avatarUrl,
            content: replyInput,
            timestamp: Date.now()
        };
        onUpdatePost({ ...post, comments: [...post.comments, newComment] });
        setReplyInput("");
    };

    const handleGenerateReplies = async () => {
         if (!settings.apiKey) return alert("Please set API Key first.");
         
         const responders = contacts.filter(c => c.canAutoReply);
         
         setIsGenerating(true);
         try {
             // Generate up to 5 new replies
             const newReplies = await generateForumReplies(
                 { title: post.title, content: post.content },
                 post.comments,
                 "Generate between 3 to 5 new replies.", 
                 responders,
                 worldEntries,
                 settings
             );

             const commentsToAdd: ForumComment[] = newReplies.map((r, idx) => {
                 const linkedContact = r.linkedContactId ? contacts.find(c => c.id === r.linkedContactId) : undefined;
                 return {
                     id: `${Date.now()}-${idx}`,
                     authorId: linkedContact ? linkedContact.id : 'random',
                     authorName: r.authorName,
                     avatarUrl: linkedContact?.avatarUrl,
                     content: r.content,
                     timestamp: Date.now() + idx * 1000
                 };
             });

             onUpdatePost({ ...post, comments: [...post.comments, ...commentsToAdd] });
             alert("生成成功 (Replies Generated)");
         } catch(e) {
             alert("生成失败 (Failed to Generate)");
         } finally {
             setIsGenerating(false);
         }
    };

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-900/30 bg-black/50 backdrop-blur-md z-10">
                 <button onClick={onBack} className="text-neutral-400 hover:text-white"><Icon.ArrowLeft className="w-6 h-6" /></button>
                 <span className="text-xs text-neutral-500">Thread #{post.id.slice(-4)}</span>
                 <button 
                    onClick={handleGenerateReplies} 
                    disabled={isGenerating}
                    className={`text-purple-400 hover:text-white border border-purple-900/50 p-1.5 rounded bg-purple-900/20 ${isGenerating ? 'animate-pulse' : ''}`}
                    title="生成回复 (Generate Replies)"
                >
                     <Icon.Sliders className="w-5 h-5 rotate-90"/>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Main Post */}
                <div className="bg-neutral-900/30 p-4 rounded-xl border-l-2 border-purple-500 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                         <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden border border-neutral-600">
                             {post.avatarUrl ? <img src={post.avatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs">?</div>}
                         </div>
                         <div>
                             <div className="font-header text-neutral-200">{post.authorName}</div>
                             <div className="text-[10px] text-neutral-500">{new Date(post.timestamp).toLocaleString()}</div>
                         </div>
                    </div>
                    <h1 className="font-header text-xl text-neutral-100 mb-2">{post.title}</h1>
                    <p className="font-display text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    <div className="flex gap-2 mt-4">
                        {post.tags.map(t => <span key={t} className="text-[10px] text-purple-400">#{t}</span>)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-500">
                        <span>点赞 {post.likes}</span>
                        <span>转发 {post.forwards || 0}</span>
                    </div>
                </div>

                {/* Comments */}
                <div className="space-y-4 pl-2 border-l border-neutral-800">
                    {post.comments.map(comment => (
                        <div key={comment.id} className="bg-neutral-900/20 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold ${comment.authorId === 'user' ? 'text-green-500' : 'text-purple-300'}`}>{comment.authorName}</span>
                                <span className="text-[10px] text-neutral-600">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-neutral-400">{comment.content}</p>
                        </div>
                    ))}
                    {post.comments.length === 0 && <p className="text-xs text-neutral-600 italic">No replies yet...</p>}
                </div>
            </div>

            {/* Reply Input */}
            <div className="p-3 bg-black/80 border-t border-neutral-800 flex gap-2">
                <input 
                  value={replyInput}
                  onChange={e => setReplyInput(e.target.value)}
                  placeholder="回复帖子 (Reply to thread)..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 text-sm text-neutral-200 outline-none focus:border-purple-500"
                />
                <button onClick={handleUserReply} className="bg-purple-900 p-2 rounded text-white hover:bg-purple-700">
                    <Icon.Send className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
};

// 8. MAIN APP COMPONENT
const App = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [worldEntries, setWorldEntries] = useState<WorldEntry[]>(INITIAL_WORLD_ENTRIES);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(INITIAL_FORUM_POSTS);
  
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeForumPostId, setActiveForumPostId] = useState<string | null>(null);
  const [typingContactId, setTypingContactId] = useState<string | null>(null);

  // Load data from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('gothic_os_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
        if (parsed.contacts) setContacts(parsed.contacts);
        if (parsed.worldEntries) setWorldEntries(parsed.worldEntries);
        if (parsed.forumPosts) setForumPosts(parsed.forumPosts);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  // Save data to local storage on change
  useEffect(() => {
    const dataToSave = {
      settings,
      userProfile,
      contacts,
      worldEntries,
      forumPosts
    };
    localStorage.setItem('gothic_os_data', JSON.stringify(dataToSave));
  }, [settings, userProfile, contacts, worldEntries, forumPosts]);

  // Apply Global CSS
  useEffect(() => {
      const styleId = 'global-custom-css';
      let styleEl = document.getElementById(styleId);
      if (settings.globalCss) {
          if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = styleId;
              document.head.appendChild(styleEl);
          }
          styleEl.textContent = settings.globalCss;
      } else if (styleEl) {
          styleEl.remove();
      }
  }, [settings.globalCss]);

  const handleNavigate = (v: AppView) => setView(v);

  const handleSendMessage = async (text: string) => {
      if (!activeContactId) return;
      const contact = contacts.find(c => c.id === activeContactId);
      if (!contact) return;

      // 1. Add User Message
      const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: Date.now()
      };
      
      const updatedHistory = [...contact.history, userMsg];
      const updatedContact = { ...contact, history: updatedHistory };
      
      // Optimistic update
      setContacts(prev => prev.map(c => c.id === activeContactId ? updatedContact : c));
      setTypingContactId(activeContactId);

      // 2. Call API
      try {
          const responseText = await sendMessageToGemini(
              null, // currentMessage is null because we added it to history
              updatedHistory,
              settings,
              worldEntries,
              contact.aiPersona,
              contact.userPersona || userProfile.persona,
              contact.userName || userProfile.name,
              contact.isOfflineMode,
              contact.targetWordCount,
              contact.linkedLoreIds
          );

          // 3. Add Model Message
          const modelMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'model',
              content: responseText,
              timestamp: Date.now()
          };

          setContacts(prev => prev.map(c => {
              if (c.id === activeContactId) {
                  return { ...c, history: [...updatedHistory, modelMsg] };
              }
              return c;
          }));

      } catch (error) {
          console.error("Chat error", error);
          // Optional: Add error message to chat
      } finally {
          setTypingContactId(null);
      }
  };

  const handleBack = () => {
      if (view === AppView.CHAT || view === AppView.CHAT_SETTINGS) {
          setView(AppView.CONTACT_LIST);
          setActiveContactId(null);
      } else if (view === AppView.FORUM_THREAD) {
          setView(AppView.FORUM_LIST);
          setActiveForumPostId(null);
      } else if (view === AppView.USER_PROFILE_SETTINGS) {
          setView(AppView.CONTACT_LIST);
      } else {
          setView(AppView.HOME);
      }
  };

  const renderContent = () => {
      switch (view) {
          case AppView.HOME:
              return <HomeScreen onNavigate={handleNavigate} />;
          case AppView.CONTACT_LIST:
              return <ContactListScreen 
                  contacts={contacts} 
                  onSelectContact={(id) => { setActiveContactId(id); setView(AppView.CHAT); }} 
                  onAddContact={() => {
                      const newContact: Contact = {
                          id: Date.now().toString(),
                          name: "New Soul",
                          avatarUrl: "",
                          userName: "",
                          aiPersona: "You are a mysterious stranger.",
                          userPersona: "",
                          backgroundUrl: "",
                          bubbleCss: "",
                          history: [],
                          responseQueue: [],
                          isOfflineMode: false
                      };
                      setContacts([...contacts, newContact]);
                  }}
                  onOpenUserProfile={() => setView(AppView.USER_PROFILE_SETTINGS)}
                  onBack={() => setView(AppView.HOME)} 
              />;
          case AppView.USER_PROFILE_SETTINGS:
               return <UserProfileScreen profile={userProfile} onUpdate={setUserProfile} onBack={handleBack} />;
          case AppView.CHAT:
              const chatContact = contacts.find(c => c.id === activeContactId);
              if (!chatContact) return null;
              return <ChatScreen 
                  contact={chatContact} 
                  onSend={handleSendMessage} 
                  onBack={handleBack} 
                  onSettings={() => setView(AppView.CHAT_SETTINGS)}
                  isTyping={typingContactId === activeContactId}
              />;
          case AppView.CHAT_SETTINGS:
              const settingContact = contacts.find(c => c.id === activeContactId);
              if (!settingContact) return null;
              return <ChatSettingsScreen 
                  contact={settingContact} 
                  onUpdate={(updated) => setContacts(contacts.map(c => c.id === updated.id ? updated : c))} 
                  onDelete={() => {
                      setContacts(contacts.filter(c => c.id !== activeContactId));
                      setView(AppView.CONTACT_LIST);
                      setActiveContactId(null);
                  }} 
                  onBack={() => setView(AppView.CHAT)} 
              />;
          case AppView.WORLD_BOOK:
              return <WorldBookScreen 
                  entries={worldEntries} 
                  contacts={contacts}
                  onUpdateContacts={setContacts}
                  onBack={() => setView(AppView.HOME)} 
                  onUpdateEntries={setWorldEntries} 
              />;
          case AppView.SETTINGS:
              return <SettingsScreen 
                  settings={settings} 
                  contacts={contacts}
                  worldEntries={worldEntries}
                  onUpdateSettings={setSettings} 
                  onBack={() => setView(AppView.HOME)} 
              />;
          case AppView.FORUM_LIST:
              return <ForumListScreen 
                  posts={forumPosts} 
                  contacts={contacts}
                  worldEntries={worldEntries}
                  settings={settings}
                  userProfile={userProfile}
                  onSelectPost={(id) => { setActiveForumPostId(id); setView(AppView.FORUM_THREAD); }} 
                  onAddPost={(p) => setForumPosts([p, ...forumPosts])} 
                  onUpdateContacts={setContacts}
                  onBack={() => setView(AppView.HOME)} 
              />;
          case AppView.FORUM_THREAD:
               const post = forumPosts.find(p => p.id === activeForumPostId);
               if (!post) return null;
               return <ForumThreadScreen 
                   post={post} 
                   contacts={contacts}
                   worldEntries={worldEntries}
                   settings={settings}
                   userProfile={userProfile}
                   onBack={handleBack} 
                   onUpdatePost={(updated) => setForumPosts(forumPosts.map(p => p.id === updated.id ? updated : p))}
               />;
          default:
              return <HomeScreen onNavigate={handleNavigate} />;
      }
  };

  return (
      <MobileFrame showStatusBar={settings.showStatusBar}>
          {renderContent()}
      </MobileFrame>
  );
};

export default App;