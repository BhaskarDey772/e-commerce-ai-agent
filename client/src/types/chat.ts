/**
 * Chat-related types
 */

export interface Message {
  id: string;
  sender: "USER" | "AI";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

export interface ChatResponse {
  success: boolean;
  data: {
    reply: string;
    sessionId: string;
    conversationId: string;
  };
}

export interface NewConversationResponse {
  success: boolean;
  data: {
    conversationId: string;
    isExisting: boolean;
  };
}

export interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export interface ChatMessageProps {
  message: Message;
}
