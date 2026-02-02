"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import type {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from "@/types/speech";

interface UserResponseInputProps {
  onSubmit: (answer: string) => void;
  isAiThinking: boolean;
  isAiSpeaking: boolean;
  placeholder?: string;
}

export default function UserResponseInput({
  onSubmit,
  isAiThinking,
  isAiSpeaking,
  placeholder = "Type your answer...",
}: UserResponseInputProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if input should be disabled
  const isDisabled = isAiThinking || isAiSpeaking;

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [input]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Stop recording when AI starts responding
  useEffect(() => {
    if (isDisabled && isRecording) {
      stopRecording(false); // Don't auto-submit if AI interrupted
    }
  }, [isDisabled, isRecording]);

  const submitAnswer = useCallback(
    (text: string) => {
      const trimmedText = text.trim();
      if (trimmedText && !isDisabled) {
        onSubmit(trimmedText);
        setInput("");
        setInterimTranscript("");
        finalTranscriptRef.current = "";
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    },
    [onSubmit, isDisabled]
  );

  const handleTextSubmit = useCallback(() => {
    submitAnswer(input);
  }, [input, submitAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const stopRecording = useCallback(
    (shouldSubmit: boolean = true) => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }

      setIsRecording(false);
      setRecordingStatus("");

      // Auto-submit the transcription if we have content
      if (shouldSubmit && finalTranscriptRef.current.trim()) {
        submitAnswer(finalTranscriptRef.current);
      }

      setInterimTranscript("");
      finalTranscriptRef.current = "";
    },
    [submitAnswer]
  );

  const startRecording = useCallback(() => {
    if (!speechSupported || isDisabled) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Reset state
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setInput("");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      setRecordingStatus("Listening...");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
        setInput(finalTranscriptRef.current);
        setRecordingStatus("Heard: " + finalTranscriptRef.current.slice(-50));
      }

      setInterimTranscript(interim);

      // Reset silence timeout whenever we get speech
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Set a timeout to auto-submit after 2 seconds of silence
      silenceTimeoutRef.current = setTimeout(() => {
        if (finalTranscriptRef.current.trim()) {
          setRecordingStatus("Processing...");
          stopRecording(true);
        }
      }, 2000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "aborted" is expected when we intentionally stop recording
      // "no-speech" happens when user hasn't spoken yet - keep listening
      if (event.error === "aborted") {
        return; // Ignore - this is intentional
      }

      if (event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
        setRecordingStatus(`Error: ${event.error}`);
        stopRecording(false);
      }
    };

    recognition.onend = () => {
      // Only auto-restart if still in recording mode and no final transcript
      if (isRecording && !finalTranscriptRef.current.trim()) {
        try {
          recognition.start();
        } catch {
          stopRecording(false);
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setRecordingStatus("Failed to start");
      setIsRecording(false);
    }
  }, [speechSupported, isDisabled, isRecording, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording(true);
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Combined display text (typed input + interim transcript)
  const displayText = isRecording
    ? (input + " " + interimTranscript).trim()
    : input;

  return (
    <div className="border-t border-border bg-card/50 p-4">
      {/* Status Bar */}
      {(isDisabled || isRecording) && (
        <div className="flex items-center gap-2 mb-3 px-1">
          {isAiSpeaking && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>AI is speaking...</span>
            </div>
          )}
          {isAiThinking && !isAiSpeaking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
          {isRecording && recordingStatus && (
            <div className="flex items-center gap-2 text-xs text-red-400 ml-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="truncate max-w-[200px]">{recordingStatus}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Text Input Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={(e) => {
              if (!isRecording) {
                setInput(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled
                ? isAiSpeaking
                  ? "Wait for AI to finish speaking..."
                  : "AI is thinking..."
                : isRecording
                ? "Listening... speak now"
                : placeholder
            }
            disabled={isDisabled}
            readOnly={isRecording}
            rows={1}
            className={`w-full resize-none bg-secondary border rounded-lg px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              isRecording
                ? "border-red-500/50 bg-red-500/5"
                : "border-border"
            }`}
          />

          {/* Recording indicator inside textarea */}
          {isRecording && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            </div>
          )}

          {/* Interim transcript indicator */}
          {isRecording && interimTranscript && (
            <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-secondary/90 rounded text-xs text-muted-foreground max-w-full truncate">
              <span className="opacity-60 italic">{interimTranscript}</span>
            </div>
          )}
        </div>

        {/* Record Button */}
        {speechSupported && (
          <button
            onClick={toggleRecording}
            disabled={isDisabled}
            className={`flex-shrink-0 p-3 rounded-lg transition-all ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-border hover:border-primary/50"
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none`}
            title={
              isDisabled
                ? "Wait for AI to finish"
                : isRecording
                ? "Click to stop and submit"
                : "Click to start voice input"
            }
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Send Button */}
        <button
          onClick={handleTextSubmit}
          disabled={isDisabled || !input.trim() || isRecording}
          className="flex-shrink-0 p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            isDisabled
              ? "Wait for AI to finish"
              : isRecording
              ? "Stop recording first"
              : "Send message"
          }
        >
          {isAiThinking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {isRecording
            ? "Speaking will auto-submit after 2s pause"
            : "Press Enter to send, Shift+Enter for new line"}
        </span>
        {speechSupported && !isRecording && (
          <span className="hidden sm:inline">Click mic for voice input</span>
        )}
      </div>
    </div>
  );
}
