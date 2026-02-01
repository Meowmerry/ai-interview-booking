"use client";

import { Bot, User } from "lucide-react";
import { Message } from "@/store/useInterviewStore";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`flex gap-3 p-4 ${
        isAssistant ? "bg-secondary/30" : "bg-transparent"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAssistant
            ? "bg-primary/20 text-primary"
            : "bg-accent/20 text-accent"
        }`}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isAssistant ? "AI Interviewer" : "You"}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              typing...
            </span>
          )}
        </div>
        <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
          {message.content || (
            <span className="text-muted-foreground italic">...</span>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-primary/50 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
