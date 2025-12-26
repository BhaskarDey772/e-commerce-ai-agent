import { MessageSquare, Minimize2, Plus, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
  };
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

// Module-level cache that persists across component mounts/unmounts
// Only cleared on page reload
const messagesCache = new Map<string, Message[]>();
const sessionIdCache = new Map<string, string | null>();
let conversationsLoaded = false;
let cachedConversations: Conversation[] = [];

export function ChatWidget({ isOpen, onClose, onMinimize }: ChatWidgetProps) {
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDataLoading = loadingConversations || loadingMessages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchAllConversations = useCallback(async () => {
    // Only fetch if not already loaded
    if (conversationsLoaded) {
      setConversations(cachedConversations);
      if (cachedConversations.length > 0 && !currentConversationId) {
        setCurrentConversationId(cachedConversations[0].id);
      }
      return;
    }

    setLoadingConversations(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/chat/conversations`);
      const data = await res.json();
      if (data.success) {
        cachedConversations = data.data.conversations;
        setConversations(cachedConversations);
        conversationsLoaded = true;
        if (cachedConversations.length > 0 && !currentConversationId) {
          setCurrentConversationId(cachedConversations[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (isOpen) {
      fetchAllConversations();
      inputRef.current?.focus();
    }
  }, [isOpen, fetchAllConversations]);

  useEffect(() => {
    if (currentConversationId && isOpen) {
      // Check if messages are already cached
      const cachedMessages = messagesCache.get(currentConversationId);
      const cachedSessionId = sessionIdCache.get(currentConversationId);

      if (cachedMessages) {
        // Use cached messages
        setMessages(cachedMessages);
        if (cachedSessionId !== undefined) {
          setSessionId(cachedSessionId);
        }
      } else {
        // Fetch messages if not cached
        fetchMessages(currentConversationId);
      }
    }
  }, [currentConversationId, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(`${config.apiBaseUrl}/chat/conversation/${conversationId}`);
      const data = await res.json();
      if (data.success) {
        // Cache the messages
        messagesCache.set(conversationId, data.data.messages);
        setMessages(data.data.messages);

        // Cache the sessionId
        if (data.data.sessionId !== undefined) {
          sessionIdCache.set(conversationId, data.data.sessionId);
          setSessionId(data.data.sessionId);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const createNewConversation = async () => {
    const emptyConversation = conversations.find((conv) => conv.messageCount === 0);

    if (emptyConversation) {
      setCurrentConversationId(emptyConversation.id);
      setMessages([]);
      // Cache empty messages for this conversation
      messagesCache.set(emptyConversation.id, []);
      sessionIdCache.set(emptyConversation.id, null);
      setSessionId(null);
      return;
    }

    try {
      const res = await fetch(`${config.apiBaseUrl}/chat/conversation/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        const newConversationId = data.data.conversationId;
        setCurrentConversationId(newConversationId);
        setMessages([]);
        setSessionId(null);
        // Cache empty messages for new conversation
        messagesCache.set(newConversationId, []);
        sessionIdCache.set(newConversationId, null);

        // Add new conversation to the list without refetching
        const newConversation: Conversation = {
          id: newConversationId,
          sessionId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0,
          preview: "New chat",
        };
        cachedConversations = [newConversation, ...cachedConversations];
        setConversations(cachedConversations);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || isDataLoading) return;

    const userMessage = trimmedInput;
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
      let conversationId = currentConversationId;
      if (!conversationId) {
        const newConvRes = await fetch(`${config.apiBaseUrl}/chat/conversation/new`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const newConvData = await newConvRes.json();
        if (newConvData.success) {
          conversationId = newConvData.data.conversationId;
          setCurrentConversationId(conversationId);
          // Cache empty messages for new conversation
          messagesCache.set(conversationId, []);
          sessionIdCache.set(conversationId, null);
          // Add to conversations list
          const newConversation: Conversation = {
            id: conversationId,
            sessionId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 0,
            preview: "New chat",
          };
          cachedConversations = [newConversation, ...cachedConversations];
          setConversations(cachedConversations);
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
        }),
      });

      const data: ChatResponse = await res.json();

      if (!data.success) {
        const errorMessage =
          (data as unknown as { error?: { message?: string } })?.error?.message ||
          "Failed to send message";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const finalConversationId = data.data.conversationId || conversationId;
      if (!finalConversationId) {
        throw new Error("No conversation ID available");
      }

      // Update sessionId cache
      if (data.data.sessionId) {
        sessionIdCache.set(finalConversationId, data.data.sessionId);
        setSessionId(data.data.sessionId);
      }

      // Update conversation ID if changed
      if (data.data.conversationId && data.data.conversationId !== conversationId) {
        setCurrentConversationId(data.data.conversationId);
      }

      // Fetch fresh messages to get the complete conversation (this will update the cache)
      await fetchMessages(finalConversationId);

      // Update conversations list without full refetch
      cachedConversations = cachedConversations.map((conv) =>
        conv.id === finalConversationId
          ? { ...conv, messageCount: conv.messageCount + 2, updatedAt: new Date().toISOString() }
          : conv,
      );
      // Sort by updatedAt descending
      cachedConversations.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setConversations([...cachedConversations]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp")));
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[90vw] max-w-[400px] h-[85vh] max-h-[600px] glass-card rounded-xl flex flex-col overflow-hidden shadow-2xl border border-border/50 z-50 animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask me anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMinimize}
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      {loadingConversations ? (
        <div className="px-4 py-2 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading conversations...</span>
          </div>
        </div>
      ) : conversations.length > 0 ? (
        <div className="px-4 py-2 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <Button
              onClick={createNewConversation}
              size="sm"
              variant="outline"
              className="gap-1.5 flex-shrink-0"
              disabled={conversations.some((conv) => conv.messageCount === 0)}
            >
              <Plus className="w-3 h-3" />
              New
            </Button>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-all",
                  currentConversationId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80",
                )}
              >
                {conv.preview || "New chat"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">How can I help you?</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask about products, get recommendations, or find the best deals.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-border/50 bg-card">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isDataLoading ? "Loading..." : "Type your message..."}
            disabled={loading || isDataLoading}
            className="flex-1 h-10 text-sm bg-secondary/50 border-border/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim() || isDataLoading}
            size="default"
            className="px-4 glow-hover disabled:opacity-50 disabled:cursor-not-allowed"
            title={isDataLoading ? "Please wait while data loads" : ""}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {isDataLoading && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Loading conversations and messages...
          </p>
        )}
      </form>
    </div>
  );
}

interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export function ChatButton({ onClick, unreadCount }: ChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg glow-primary z-40"
      title="Open chat"
    >
      <MessageSquare className="w-5 h-5" />
      {unreadCount && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
