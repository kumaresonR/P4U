import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Video, Send, Smile, Paperclip, Mic, Check, CheckCheck, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api as http } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

const EMOJI_QUICK = ['😀', '❤️', '😂', '👍', '🔥', '😍', '🎉', '💯'];

export default function SocioDMChatPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const currentUserId = customerUser?.id || '';
  /** Social messages use profile ids, not customer user ids */
  const [mySocialProfileId, setMySocialProfileId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    http
      .get<any>('/social/profiles/me')
      .then((p) => setMySocialProfileId(p?.id || ''))
      .catch(() => setMySocialProfileId(''));
  }, [currentUserId]);

  // Load recipient profile
  useEffect(() => {
    if (!recipientId) return;
    http.get<any>(`/social/profiles/${recipientId}`).then(data => {
      if (data) setRecipientProfile(data);
      else setRecipientProfile({ display_name: 'User', username: 'user', avatar_url: '' });
    }).catch(() => {
      setRecipientProfile({ display_name: 'User', username: 'user', avatar_url: '' });
    });
  }, [recipientId]);

  // Find or create conversation
  useEffect(() => {
    if (!currentUserId || !recipientId) return;
    const init = async () => {
      setLoading(true);
      try {
        const res = await http.post<any>('/social/conversations/find-or-create', {
          recipient_id: recipientId,
        });
        setConversationId(res?.id || res?.conversation_id || null);
      } catch {
        toast.error('Could not start conversation');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUserId, recipientId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await http.get<any>(`/social/conversations/${conversationId}/messages`, { per_page: 200 } as any);
      const data: Message[] = (Array.isArray(res) ? res : (res?.data || [])).map((m: any) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.content || '',
        message_type: m.message_type || 'text',
        media_url: m.media_url,
        is_read: m.is_read || false,
        created_at: m.created_at,
      }));
      setMessages(data);

      // Mark unread as read (sender is always a social profile id)
      const unread = data.filter((m) => !m.is_read && m.sender_id !== mySocialProfileId);
      if (unread.length > 0) {
        http.patch(`/social/conversations/${conversationId}/messages/read`, {}).catch(() => {});
      }
    } catch {}
  }, [conversationId, mySocialProfileId]);

  // Initial load + polling (every 3s)
  useEffect(() => {
    if (!conversationId) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conversationId, loadMessages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !mySocialProfileId || !conversationId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: mySocialProfileId,
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await http.post(`/social/conversations/${conversationId}/messages`, { content, message_type: 'text' });
      // Refresh to get server-assigned IDs
      loadMessages();
    } catch {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  }, [newMessage, mySocialProfileId, conversationId, loadMessages]);

  const isMine = (msg: Message) => msg.sender_id === mySocialProfileId;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card shrink-0">
        <button onClick={() => navigate('/app/social/messages')}><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => recipientId && navigate(`/app/social/@${recipientProfile?.username || recipientId}`)} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {recipientProfile?.avatar_url ? (
              <img src={recipientProfile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-sm font-bold">{recipientProfile?.display_name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{recipientProfile?.display_name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" />
              {isTyping ? 'typing...' : 'End-to-end encrypted'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" onClick={() => toast.info("Voice call coming soon")}>
            <Phone className="h-5 w-5" />
          </button>
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" onClick={() => toast.info("Video call coming soon")}>
            <Video className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Encryption notice */}
      <div className="text-center py-2 px-4">
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-2.5 w-2.5" />
          Messages are private between you and {recipientProfile?.display_name || 'this user'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const mine = isMine(msg);
          const showAvatar = !mine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!mine && showAvatar && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  {recipientProfile?.avatar_url ? (
                    <img src={recipientProfile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span className="text-[10px] font-bold">{recipientProfile?.display_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              )}
              {!mine && !showAvatar && <div className="w-7 shrink-0" />}
              <div className={`max-w-[75%] ${mine ? 'order-first' : ''}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[9px] text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</span>
                  {mine && (
                    msg.is_read
                      ? <CheckCheck className="h-3 w-3 text-primary" />
                      : <Check className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold">{recipientProfile?.display_name?.charAt(0)}</span>
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2.5">
              <motion.div className="flex gap-1" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              </motion.div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji bar */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border/30 bg-card">
            <div className="flex gap-2 p-3 flex-wrap">
              {EMOJI_QUICK.map(e => (
                <button key={e} className="text-2xl hover:scale-125 transition-transform" onClick={() => setNewMessage(prev => prev + e)}>{e}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="border-t border-border/30 bg-card px-3 py-2.5 flex items-center gap-2 safe-area-bottom shrink-0">
        <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0" onClick={() => toast.info("Attachments coming soon")}>
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Message..."
            className="h-10 pr-10 rounded-full"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        {newMessage.trim() ? (
          <button onClick={sendMessage} className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        ) : (
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0" onClick={() => toast.info("Voice notes coming soon")}>
            <Mic className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
