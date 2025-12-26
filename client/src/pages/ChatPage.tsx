import { MessageSquare, Plus, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "USER" | "AI";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

interface ChatResponse {
  success: boolean;
  data: {
    reply: string;
    sessionId: string;
    conversationId: string;
    products?: Array<{
      id: string;
      name: string;
      price: number;
      image?: string;
      rating?: number;
    }>;
  };
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchAllConversations = useCallback(async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/chat/conversations`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.data.conversations);
        // If no conversation is selected and we have conversations, select the first one
        if (data.data.conversations.length > 0 && !currentConversationId) {
          setCurrentConversationId(data.data.conversations[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [currentConversationId]);

  useEffect(() => {
    // Fetch all conversations on mount
    fetchAllConversations();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async (sid: string) => {
    try {
      if (!sid) return;

      const res = await fetch(`${config.apiBaseUrl}/chat/conversations?sessionId=${sid}`);
      const data = await res.json();
      if (data.success) {
        // Merge with existing conversations, avoiding duplicates
        setConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newConvs = data.data.conversations.filter(
            (c: Conversation) => !existingIds.has(c.id),
          );
          return [...prev, ...newConvs].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        });
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/chat/conversation/${conversationId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const createNewConversation = async () => {
    // Check if there's already a conversation with 0 messages
    const emptyConversation = conversations.find((conv) => conv.messageCount === 0);

    if (emptyConversation) {
      // Switch to the existing empty conversation instead of creating a new one
      setCurrentConversationId(emptyConversation.id);
      setMessages([]);
      return;
    }

    // No empty conversation exists, create a new one
    try {
      const res = await fetch(`${config.apiBaseUrl}/chat/conversation/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setCurrentConversationId(data.data.conversationId);
        setMessages([]);
        // Don't set sessionId yet - it will be created when first message is sent
        setSessionId(null);
        // Refresh conversations list to include the new one
        fetchAllConversations();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      sender: "USER",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // If we have a conversationId, use it. Otherwise, create a new conversation first
      let conversationId = currentConversationId;
      if (!conversationId) {
        // Create new conversation first
        const newConvRes = await fetch(`${config.apiBaseUrl}/chat/conversation/new`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const newConvData = await newConvRes.json();
        if (newConvData.success) {
          conversationId = newConvData.data.conversationId;
          setCurrentConversationId(conversationId);
        } else {
          throw new Error("Failed to create conversation");
        }
      }

      const res = await fetch(`${config.apiBaseUrl}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId,
          // Don't send sessionId - backend will create it if needed
        }),
      });

      const data: ChatResponse = await res.json();

      if (data.success) {
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }

        // Update conversationId if it was returned
        if (data.data.conversationId) {
          setCurrentConversationId(data.data.conversationId);
          // Refresh messages for the updated conversation
          fetchMessages(data.data.conversationId);
        } else if (conversationId) {
          // Refresh messages for current conversation
          fetchMessages(conversationId);
        }

        // Refresh all conversations to show updated list
        fetchAllConversations();

        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.id.startsWith("temp"));
          return [
            ...filtered,
            {
              id: `user-${Date.now()}`,
              sender: "USER" as const,
              content: userMessage,
              createdAt: new Date().toISOString(),
            },
            {
              id: `ai-${Date.now()}`,
              sender: "AI" as const,
              content: data.data.reply,
              createdAt: new Date().toISOString(),
            },
          ];
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Conversations Sidebar */}
      <div className="w-72 glass-card rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <Button
            onClick={createNewConversation}
            className="w-full gap-2 glow-hover"
            disabled={conversations.some((conv) => conv.messageCount === 0)}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          {conversations.some((conv) => conv.messageCount === 0) && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Complete the empty chat first
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversationId(conv.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all duration-200",
                    currentConversationId === conv.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-secondary/50 border border-transparent",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2">
                        {conv.preview || "New conversation"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {conv.messageCount} messages
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 glass-card rounded-xl flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">AI Shopping Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask me anything about products</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground max-w-sm">
                Ask me about products, get recommendations, or compare items to find the best deals.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-border/50">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 h-12 bg-secondary/50 border-border/50 focus:border-primary"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="lg"
              className="px-6 glow-hover"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
