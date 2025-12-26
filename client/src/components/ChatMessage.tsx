import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedMessage } from "./StructuredResponse";

interface Message {
  id: string;
  sender: "USER" | "AI";
  content: string;
  createdAt: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "USER";

  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-gradient-to-br from-primary to-accent" : "bg-secondary border border-border",
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3",
          isUser ? "chat-bubble-user rounded-br-md" : "chat-bubble-ai rounded-bl-md",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <ParsedMessage content={message.content} />
        )}
        <span className="text-[10px] opacity-60 mt-2 block">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary border border-border">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="chat-bubble-ai rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce-subtle" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce-subtle animation-delay-100" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce-subtle animation-delay-200" />
        </div>
      </div>
    </div>
  );
}
