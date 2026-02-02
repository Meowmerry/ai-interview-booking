import { useState, useCallback } from "react";
import { useInterviewStore, Message } from "@/store/useInterviewStore";

interface UseChatOptions {
  onError?: (error: Error) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    messages,
    jobDescription,
    interviewTypes,
    difficulty,
    duration,
    addMessage,
    setIsSpeaking,
  } = useInterviewStore();

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      // Add user message to store
      const userMsg: Message = { role: "user", content: userMessage };
      addMessage(userMsg);

      // Prepare messages for API (include the new user message)
      const apiMessages = [...messages, userMsg];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: apiMessages,
            jobDescription,
            interviewTypes,
            difficulty,
            duration,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        setIsSpeaking(true);

        const decoder = new TextDecoder();
        let assistantContent = "";

        // Create a temporary message for streaming
        const tempAssistantMsg: Message = { role: "assistant", content: "" };
        addMessage(tempAssistantMsg);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // Update the last message with accumulated content
          useInterviewStore.setState((state) => {
            const updatedMessages = [...state.messages];
            const lastIndex = updatedMessages.length - 1;
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === "assistant") {
              updatedMessages[lastIndex] = {
                ...updatedMessages[lastIndex],
                content: assistantContent,
              };
            }
            return { messages: updatedMessages };
          });
        }

        setIsSpeaking(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setIsSpeaking(false);
        options.onError?.(error);

        // Remove the empty assistant message if there was an error
        useInterviewStore.setState((state) => {
          const updatedMessages = [...state.messages];
          const lastIndex = updatedMessages.length - 1;
          if (
            lastIndex >= 0 &&
            updatedMessages[lastIndex].role === "assistant" &&
            !updatedMessages[lastIndex].content
          ) {
            updatedMessages.pop();
          }
          return { messages: updatedMessages };
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, jobDescription, interviewTypes, difficulty, duration, addMessage, setIsSpeaking, isLoading, options]
  );

  const startInterview = useCallback(async () => {
    // Send an initial message to start the interview
    await sendMessage("Hello, I'm ready to start the interview.");
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    startInterview,
  };
}
