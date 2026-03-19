import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage, UserAccount } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/firestore-errors';
import { Send, Image as ImageIcon, Paperclip, User, Hash, MessageSquare, Search, MoreVertical, Phone, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatPageProps {
  currentUser: UserAccount;
}

const ChatPage = ({ currentUser }: ChatPageProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [recipient, setRecipient] = useState<UserAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserAccount[];
        setUsers(userList.filter(u => u.id !== currentUser.id));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, [currentUser.id]);

  // Listen to Messages
  useEffect(() => {
    setLoading(true);
    let q;
    
    if (activeChannel === 'general') {
      q = query(
        collection(db, 'messages'), 
        where('channelId', '==', 'general')
      );
    } else {
      q = query(
        collection(db, 'messages'), 
        where('channelId', '==', activeChannel)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      // Sort client-side to avoid composite index requirement
      const sortedMsgs = msgs.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(sortedMsgs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messages');
      console.error("Error fetching messages:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderPhoto: currentUser.photoUrl || '',
        content: newMessage,
        timestamp: new Date().toISOString(),
        channelId: activeChannel
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const getDmChannelId = (user1Id: string, user2Id: string) => {
    return [user1Id, user2Id].sort().join('_');
  };

  const handleUserClick = (user: UserAccount) => {
    const channelId = getDmChannelId(currentUser.id, user.id);
    setActiveChannel(channelId);
    setRecipient(user);
  };

  const handleGeneralClick = () => {
    setActiveChannel('general');
    setRecipient(null);
  };

  const filteredUsers = users.filter(u => 
    u.isOnline && (
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const renderMessageContent = (content: string) => {
    // Basic mention highlighting
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={index} className="text-yellow-600 font-bold bg-yellow-50 px-1 rounded">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[var(--bg-card)] rounded-[32px] border border-[var(--border)] shadow-xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-[var(--bg-card-alt)] border-r border-[var(--border)] flex flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight mb-4">Mensagens</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Buscar pessoas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-card)] pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/20 text-[var(--text-main)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {/* Channels */}
          <div>
            <p className="px-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Canais</p>
            <button 
              onClick={handleGeneralClick}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeChannel === 'general' 
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-yellow-500/30' 
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeChannel === 'general' ? 'bg-white/20' : 'bg-[var(--bg-card)]'}`}>
                <Hash size={16} />
              </div>
              <span className="font-bold text-sm">Chat Geral</span>
            </button>
          </div>

          {/* Direct Messages */}
          <div>
            <p className="px-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Membros Online ({filteredUsers.length})</p>
            <div className="space-y-1">
              {filteredUsers.map(user => (
                <button 
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    recipient?.id === user.id
                      ? 'bg-[var(--bg-card)] border border-[var(--border)] shadow-sm' 
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center overflow-hidden border-2 border-[var(--border)] shadow-sm">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-[var(--text-muted)] text-xs">{user.name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-card)] rounded-full"></div>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${recipient?.id === user.id ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]'}`}>
                      {user.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-card)]">
        {/* Header */}
        <div className="h-20 border-b border-[var(--border)] flex items-center justify-between px-8 bg-[var(--bg-card)]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {activeChannel === 'general' ? (
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                <Hash size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--bg-card-alt)] overflow-hidden">
                {recipient?.photoUrl ? (
                  <img src={recipient.photoUrl} alt={recipient.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <User size={20} />
                  </div>
                )}
              </div>
            )}
            <div>
              <h3 className="font-black text-[var(--text-main)] text-lg">
                {activeChannel === 'general' ? 'Chat Geral' : recipient?.name}
              </h3>
              <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {activeChannel === 'general' ? `${users.length + 1} membros` : 'Online agora'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-colors">
              <Phone size={20} />
            </button>
            <button className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-colors">
              <Video size={20} />
            </button>
            <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] rounded-xl transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[var(--bg-card-alt)]/30">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] opacity-50">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="font-bold">Nenhuma mensagem ainda</p>
                  <p className="text-sm">Comece a conversa!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-card-alt)] flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-[var(--border)] shadow-sm">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} alt={msg.senderName} className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div className={`p-4 rounded-2xl shadow-sm ${
                        isMe 
                          ? 'bg-[var(--accent)] text-[var(--accent-text)] rounded-br-none' 
                          : 'bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border)] rounded-bl-none'
                      }`}>
                        {!isMe && <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{msg.senderName}</p>}
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                          {renderMessageContent(msg.content)}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-2 ${isMe ? 'text-[var(--accent-text)]/70' : 'text-[var(--text-muted)]'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-6 bg-[var(--bg-card)] border-t border-[var(--border)]">
          <div className="flex items-center gap-3 bg-[var(--bg-card-alt)] p-2 rounded-2xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 focus-within:border-[var(--accent)] transition-all">
            <button type="button" className="p-3 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)] rounded-xl transition-all shadow-sm">
              <Paperclip size={20} />
            </button>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Mensagem para ${activeChannel === 'general' ? '#geral' : recipient?.name}...`}
              className="flex-1 bg-transparent text-[var(--text-main)] outline-none font-medium placeholder:text-[var(--text-muted)]"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="p-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-500/20"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] font-medium mt-3 text-center">
            Pressione Enter para enviar. Use <span className="font-bold text-[var(--accent)]">@nome</span> para mencionar.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
