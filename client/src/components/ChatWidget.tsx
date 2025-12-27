import axios from "axios";
import { MessageSquare, Minimize2, Plus, Send, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatAPI } from "@/lib/chat-api";
import type {
  ChatButtonProps,
  ChatResponse,
  ChatWidgetProps,
  Conversation,
  Message,
} from "@/types";
import { cn } from "@/lib/utils";

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

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      // Check if messages are already cached
      const cached = messagesCache.get(conversationId);
      if (cached && cached.length > 0) {
        setMessages(cached);
        const cachedSessionId = sessionIdCache.get(conversationId);
        if (cachedSessionId !== undefined) {
          setSessionId(cachedSessionId);
        }
        return;
      }

      // Check if already loading this conversation
      if (loadingMessages) {
        return;
      }

      setLoadingMessages(true);
      setMessages([]);
      try {
        const data = await chatAPI.getConversationById(conversationId);
        console.log("Fetched conversation data:", data);
        if (data.success && data.data) {
          if (Array.isArray(data.data.messages)) {
            messagesCache.set(conversationId, data.data.messages);
            setMessages(data.data.messages);
          } else {
            console.warn("Messages is not an array:", data.data.messages);
            setMessages([]);
          }

          if (data.data.sessionId !== undefined) {
            sessionIdCache.set(conversationId, data.data.sessionId);
            setSessionId(data.data.sessionId);
          }
        } else {
          console.warn("Response not successful or missing data:", data);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching messages:", error);
          if (axios.isAxiosError(error)) {
            console.error("Axios error details:", {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              message: error.message,
            });
          }
          const errorMessage =
            axios.isAxiosError(error) && error.response?.data
              ? (error.response.data as { error?: { message?: string } })?.error?.message ||
                "Failed to load messages"
              : error instanceof Error
                ? error.message
                : "Failed to load messages";
          toast.error(errorMessage);
        } else {
          console.log("Request was cancelled");
        }
      } finally {
        setLoadingMessages(false);
      }
    },
    [loadingMessages],
  );

  const fetchAllConversations = useCallback(async () => {
    if (conversationsLoaded) {
      setConversations(cachedConversations);
      if (Array.isArray(cachedConversations) && cachedConversations.length === 0) {
        const newConvData = await chatAPI.createNewConversation();
        if (newConvData.success) {
          const newConversationId = newConvData.data.conversationId;
          const newConversation: Conversation = {
            id: newConversationId,
            sessionId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 0,
            preview: "New chat",
          };
          cachedConversations = [newConversation];
          setConversations(cachedConversations);
          setCurrentConversationId(newConversationId);
          setMessages([]);
          messagesCache.set(newConversationId, []);
          sessionIdCache.set(newConversationId, null);
        }
      } else if (cachedConversations.length > 0 && !currentConversationId) {
        const firstConv = cachedConversations[0];
        setCurrentConversationId(firstConv.id);
        if (firstConv.messageCount > 0) {
          const cached = messagesCache.get(firstConv.id);
          if (cached) {
            setMessages(cached);
          } else {
            await fetchMessages(firstConv.id);
          }
        } else {
          setMessages([]);
          messagesCache.set(firstConv.id, []);
        }
      }
      return;
    }

    setLoadingConversations(true);
    try {
      const data = await chatAPI.getConversations();
      if (data.success && data.data && Array.isArray(data.data.conversations)) {
        cachedConversations = data.data.conversations;
        setConversations(cachedConversations);
        conversationsLoaded = true;

        if (cachedConversations.length === 0) {
          const newConvData = await chatAPI.createNewConversation();
          if (newConvData.success) {
            const newConversationId = newConvData.data.conversationId;
            const newConversation: Conversation = {
              id: newConversationId,
              sessionId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messageCount: 0,
              preview: "New chat",
            };
            cachedConversations = [newConversation];
            setConversations(cachedConversations);
            setCurrentConversationId(newConversationId);
            setMessages([]);
            messagesCache.set(newConversationId, []);
            sessionIdCache.set(newConversationId, null);
          }
        } else if (
          Array.isArray(cachedConversations) &&
          cachedConversations.length > 0 &&
          !currentConversationId
        ) {
          const firstConv = cachedConversations[0];
          setCurrentConversationId(firstConv.id);
          if (firstConv.messageCount > 0) {
            const cached = messagesCache.get(firstConv.id);
            if (cached) {
              setMessages(cached);
            } else {
              await fetchMessages(firstConv.id);
            }
          } else {
            setMessages([]);
            messagesCache.set(firstConv.id, []);
          }
        }
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
      }
    } finally {
      setLoadingConversations(false);
    }
  }, [currentConversationId, fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      fetchAllConversations();
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      if (!isOpen) {
        chatAPI.cancelAllRequests();
      }
    };
  }, [isOpen, fetchAllConversations]);

  useEffect(() => {
    if (loading || loadingMessages) return;

    if (currentConversationId && isOpen) {
      const cachedMessages = messagesCache.get(currentConversationId);
      const cachedSessionId = sessionIdCache.get(currentConversationId);

      if (cachedMessages && cachedMessages.length > 0) {
        const tempMessages = messages.filter((m) => m.id.startsWith("temp"));
        if (tempMessages.length > 0) {
          setMessages([...cachedMessages, ...tempMessages]);
        } else {
          setMessages(cachedMessages);
        }
        if (cachedSessionId !== undefined) {
          setSessionId(cachedSessionId);
        }
      } else {
        const conversation = Array.isArray(conversations)
          ? conversations.find((c) => c.id === currentConversationId)
          : null;
        if (conversation && conversation.messageCount > 0) {
          fetchMessages(currentConversationId);
        } else {
          const tempMessages = messages.filter((m) => m.id.startsWith("temp"));
          if (tempMessages.length === 0) {
            setMessages([]);
            messagesCache.set(currentConversationId, []);
          }
        }
      }
    } else if (!currentConversationId && isOpen) {
      if (!loading) {
        setMessages([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, isOpen, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewConversation = async () => {
    const emptyConversation = Array.isArray(conversations)
      ? conversations.find((conv) => conv.messageCount === 0)
      : null;

    if (emptyConversation) {
      setCurrentConversationId(emptyConversation.id);
      setMessages([]);
      messagesCache.set(emptyConversation.id, []);
      sessionIdCache.set(emptyConversation.id, null);
      setSessionId(null);
      return;
    }

    try {
      const data = await chatAPI.createNewConversation();
      if (data.success) {
        const newConversationId = data.data.conversationId;
        setCurrentConversationId(newConversationId);
        setMessages([]);
        setSessionId(null);
        messagesCache.set(newConversationId, []);
        sessionIdCache.set(newConversationId, null);

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
      if (!axios.isCancel(error)) {
        console.error("Error creating conversation:", error);
      }
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
      id: `temp-user-${Date.now()}`,
      sender: "USER",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      let conversationId = currentConversationId || null;

      if (!conversationId) {
        const existingConversation = Array.isArray(conversations)
          ? conversations.find((conv) => conv.messageCount > 0)
          : null;

        if (existingConversation) {
          conversationId = existingConversation.id;
          const cachedMessages = messagesCache.get(conversationId);
          if (cachedMessages && cachedMessages.length > 0) {
            setMessages([...cachedMessages, tempUserMessage]);
          } else {
            await fetchMessages(conversationId);
            setMessages((prev) => {
              const withoutTemp = prev.filter((m) => !m.id.startsWith("temp"));
              return [...withoutTemp, tempUserMessage];
            });
          }
          setCurrentConversationId(conversationId);
        }
      } else {
        setMessages((prev) => {
          if (!prev.some((m) => m.id === tempUserMessage.id)) {
            return [...prev, tempUserMessage];
          }
          return prev;
        });
      }

      const data = await chatAPI.sendMessage({
        message: userMessage,
        conversationId: conversationId,
      });

      if (!data.success) {
        const errorMessage =
          (data as unknown as { error?: { message?: string } })?.error?.message ||
          "Failed to send message";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const finalConversationId = data.data.conversationId;
      if (!finalConversationId) {
        throw new Error("No conversation ID available");
      }

      // Update conversation ID if it was created by the backend
      if (finalConversationId !== conversationId) {
        setCurrentConversationId(finalConversationId);
        conversationId = finalConversationId;

        // If this is a new conversation created by backend, add it to the list
        const existingConv = Array.isArray(cachedConversations)
          ? cachedConversations.find((c) => c.id === finalConversationId)
          : null;

        if (!existingConv) {
          const newConversation: Conversation = {
            id: finalConversationId,
            sessionId: data.data.sessionId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 2,
            preview: userMessage.substring(0, 50),
          };
          cachedConversations = [newConversation, ...cachedConversations];
          setConversations([...cachedConversations]);
        }
      }

      // Update sessionId cache
      if (data.data.sessionId) {
        sessionIdCache.set(finalConversationId, data.data.sessionId);
        setSessionId(data.data.sessionId);
      }

      // Parse the reply from the API response and add it directly
      const aiReply: Message = {
        id: `ai-${Date.now()}`,
        sender: "AI",
        content: data.data.reply,
        createdAt: new Date().toISOString(),
      };

      // Remove temp user message and add both real messages
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith("temp"));
        const updated = [
          ...filtered,
          {
            ...tempUserMessage,
            id: `user-${Date.now()}`,
          },
          aiReply,
        ];

        // Update cache
        messagesCache.set(finalConversationId, updated);
        return updated;
      });

      // Update conversation preview with first message if it's the first message
      const currentConv = Array.isArray(cachedConversations)
        ? cachedConversations.find((c) => c.id === finalConversationId)
        : null;
      const isFirstMessage = currentConv?.messageCount === 0;

      // Update conversations list
      if (Array.isArray(cachedConversations)) {
        cachedConversations = cachedConversations.map((conv) => {
          if (conv.id === finalConversationId) {
            return {
              ...conv,
              messageCount: conv.messageCount + 2,
              updatedAt: new Date().toISOString(),
              preview: isFirstMessage ? userMessage.substring(0, 50) : conv.preview,
            };
          }
          return conv;
        });

        // Sort by updatedAt descending
        cachedConversations.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setConversations([...cachedConversations]);
      }
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
    <div className="fixed bottom-4 right-4 w-[90vw] max-w-[400px] h-[85vh] max-h-[600px] bg-card rounded-xl flex flex-col overflow-hidden shadow-2xl border border-border/50 z-50 animate-fade-in">
      {/* Header */}
      <div className="px-3 py-2.5 bg-gradient-to-r from-primary/90 to-primary flex items-center justify-between text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Chat with us!</h3>
            <p className="text-xs text-white/80">We typically reply in a few minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={onMinimize}
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      {loadingConversations ? (
        <div className="px-3 py-1.5 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading conversations...</span>
          </div>
        </div>
      ) : conversations.length > 0 ? (
        <div className="px-3 py-1.5 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <Button
              onClick={createNewConversation}
              size="sm"
              variant="outline"
              className="gap-1 flex-shrink-0 h-7 text-xs"
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
                  "flex-shrink-0 px-2.5 py-1 rounded-lg text-xs transition-all h-7",
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
      <ScrollArea className="flex-1 px-3 py-2">
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 px-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3 border-2 border-primary/20">
              <User className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1.5 text-foreground">Hi there! 👋</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-3">
              I'm here to help you find products, answer questions, or assist with anything you
              need.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <button
                onClick={() => setInput("Show me best deals")}
                className="px-2.5 py-1 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
              >
                Best Deals
              </button>
              <button
                onClick={() => setInput("What's your return policy?")}
                className="px-2.5 py-1 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
              >
                Return Policy
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-3 py-2 border-t border-border/50 bg-card">
        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isDataLoading ? "Loading..." : "Type your message..."}
            disabled={loading || isDataLoading}
            className="flex-1 h-9 text-sm bg-secondary/50 border-border/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim() || isDataLoading}
            size="default"
            className="px-3 h-9 glow-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Loading conversations and messages...
          </p>
        )}
      </form>
    </div>
  );
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
