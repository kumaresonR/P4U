import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api as http } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type ChatThread = {
  id: string;
  property_id: string;
  other_user_id: string;
  other_name: string;
  last_message: { id: string; message: string; created_at: string; sender_id: string };
  unread: number;
};

export default function PropertyMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customerUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = customerUser?.customer_id || customerUser?.id || "";
  const [activeChat, setActiveChat] = useState<string | null>(searchParams.get("chat"));
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["propertyConversations", userId],
    queryFn: async () => {
      if (!userId) return [];
      return http.get<ChatThread[]>("/properties/my/chat-threads");
    },
    enabled: !!userId,
    refetchInterval: activeChat ? 3000 : 8000,
  });

  const chatUnderscore = activeChat?.indexOf("_") ?? -1;
  const chatOtherId = activeChat && chatUnderscore > 0 ? activeChat.slice(0, chatUnderscore) : "";
  const chatPropertyId = activeChat && chatUnderscore > 0 ? activeChat.slice(chatUnderscore + 1) : "";

  const { data: chatMessages } = useQuery({
    queryKey: ["chatMessages", activeChat, userId],
    queryFn: async () => {
      if (!activeChat || !userId || !chatPropertyId || !chatOtherId) return [];
      return http.get<any[]>(`/properties/${chatPropertyId}/messages/with/${chatOtherId}`);
    },
    enabled: !!activeChat && !!userId && !!chatPropertyId && !!chatOtherId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!message.trim() || !activeChat || !chatPropertyId) return;
    try {
      await http.post(`/properties/${chatPropertyId}/messages`, { message: message.trim() });
    } catch {
      toast.error("Failed to send");
      return;
    }
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["chatMessages", activeChat] });
    queryClient.invalidateQueries({ queryKey: ["propertyConversations"] });
  };

  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Login Required</h2>
          <Button className="mt-4" onClick={() => navigate("/app/login")}>Login</Button>
        </div>
      </CustomerLayout>
    );
  }

  if (activeChat) {
    const conv = conversations?.find((c) => c.id === activeChat);
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-4rem)]">
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
            <button type="button" onClick={() => setActiveChat(null)}><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{conv?.other_name || "Chat"}</p>
              <p className="text-[10px] text-muted-foreground">Property: {chatPropertyId.substring(0, 8)}...</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/app/find-home/${chatPropertyId}`)}>View Property</Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  m.sender_id === userId
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}>
                  <p>{m.message}</p>
                  <p className={`text-[9px] mt-1 ${m.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-24 md:pb-6">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Messages</h1>
        </div>

        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 m-4 rounded-lg" />)
          ) : !conversations?.length ? (
            <div className="text-center py-16">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Contact property owners to start a conversation</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button key={conv.id} type="button" className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex items-center gap-3"
                onClick={() => setActiveChat(conv.id)}>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{conv.other_name}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(conv.last_message.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message.message}</p>
                </div>
                {conv.unread > 0 && (
                  <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full shrink-0">
                    {conv.unread}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
