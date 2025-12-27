import { User } from "lucide-react";
import type { ChatMessageProps } from "@/types";
import { cn } from "@/lib/utils";
import { ParsedMessage } from "./StructuredResponse";

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "USER";

  return (
    <div className={cn("flex gap-2 animate-fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-primary to-accent"
            : "bg-primary/10 border-2 border-primary/20",
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary-foreground" />
        ) : (
          <User className="w-3.5 h-3.5 text-primary" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] rounded-xl px-3 py-2",
          isUser ? "chat-bubble-user rounded-br-md" : "chat-bubble-ai rounded-bl-md",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <ParsedMessage content={message.content} />
        )}
        <span className="text-[10px] opacity-60 mt-1.5 block">
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
    <div className="flex gap-2 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary/20">
        <User className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="chat-bubble-ai rounded-xl rounded-bl-md px-3 py-2">
        <div className="flex gap-1.5 items-center h-4">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce-subtle" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce-subtle animation-delay-100" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce-subtle animation-delay-200" />
        </div>
      </div>
    </div>
  );
}
