"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useInterviewStore } from "@/store/useInterviewStore";
import { useChat } from "@/hooks/useChat";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import ChatMessage from "./ChatMessage";
import UserResponseInput from "./UserResponseInput";
import Modal from "./Modal";
import Scorecard from "./Scorecard";
import {
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Volume2,
  VolumeX,
  Settings,
  ChevronDown,
} from "lucide-react";


// Dynamic import for Three.js component to avoid SSR issues
const InterviewerScene = dynamic(() => import("./InterviewerScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gradient-to-b from-[#0a0a0f] to-[#111118] flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading 3D scene...</div>
    </div>
  ),
});


export default function InterviewPage() {
  const {
    isSpeaking,
    setIsSpeaking,
    setCurrentStep,
    clearMessages,
    jobDescription,
    interviewTypes,
    difficulty,
    scorecard,
    isScorecardLoading,
    scorecardError,
    setScorecard,
    setScorecardLoading,
    setScorecardError,
    resetInterview,
    preferredVoice,
    setPreferredVoice,
  } = useInterviewStore();

  const { messages, isLoading, error, sendMessage, startInterview } = useChat({
    onError: (err) => console.error("Chat error:", err),
  });

  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const lastSpokenIndexRef = useRef(-1);
  const prevIsLoadingRef = useRef(false);

  // Speech synthesis hook
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking: isTTSSpeaking,
    isSupported: isTTSSupported,
  } = useSpeechSynthesis({
    rate: 1.0,
    pitch: 1.0,
    preferredGender: preferredVoice,
    onStart: () => setIsSpeaking(true),
    onEnd: () => setIsSpeaking(false),
    onError: () => setIsSpeaking(false),
  });

  // Sync TTS speaking state with store
  useEffect(() => {
    setIsSpeaking(isTTSSpeaking);
  }, [isTTSSpeaking, setIsSpeaking]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Start interview automatically when component mounts
  useEffect(() => {
    if (!hasStartedRef.current && messages.length === 0) {
      hasStartedRef.current = true;
      startInterview();
    }
  }, [startInterview, messages.length]);

  // Speak AI response when streaming completes
  useEffect(() => {
    // Detect when loading transitions from true to false (streaming complete)
    const streamingJustCompleted = prevIsLoadingRef.current && !isLoading;
    prevIsLoadingRef.current = isLoading;

    if (streamingJustCompleted && !isMuted && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Only speak if it's an assistant message we haven't spoken yet
      if (
        lastMessage.role === "assistant" &&
        lastMessage.content &&
        messages.length - 1 > lastSpokenIndexRef.current
      ) {
        lastSpokenIndexRef.current = messages.length - 1;
        speak(lastMessage.content);
      }
    }
  }, [isLoading, messages, isMuted, speak]);

  const handleEndInterview = useCallback(() => {
    stopSpeaking();
    setCurrentStep("feedback");
  }, [setCurrentStep, stopSpeaking]);

  const handleBackToSetup = useCallback(() => {
    stopSpeaking();
    clearMessages();
    setCurrentStep("setup");
  }, [clearMessages, setCurrentStep, stopSpeaking]);

  const handleRestartInterview = useCallback(() => {
    stopSpeaking();
    clearMessages();
    setScorecard(null);
    setScorecardError(null);
    lastSpokenIndexRef.current = -1;
    hasStartedRef.current = false;
    // Small delay to ensure state is cleared before restarting
    setTimeout(() => {
      hasStartedRef.current = true;
      startInterview();
    }, 100);
  }, [
    clearMessages,
    startInterview,
    setScorecard,
    setScorecardError,
    stopSpeaking,
  ]);

  const handleFinishInterview = useCallback(async () => {
    stopSpeaking();

    if (messages.length < 2) {
      setScorecardError(
        "Please complete at least one exchange before finishing the interview."
      );
      setShowScorecardModal(true);
      return;
    }

    setShowScorecardModal(true);
    setScorecardLoading(true);
    setScorecardError(null);

    try {
      const response = await fetch("/api/scorecard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          jobDescription,
          interviewTypes,
          difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const scorecardData = await response.json();
      setScorecard(scorecardData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate scorecard";
      setScorecardError(errorMessage);
    } finally {
      setScorecardLoading(false);
    }
  }, [
    messages,
    jobDescription,
    interviewTypes,
    difficulty,
    setScorecard,
    setScorecardLoading,
    setScorecardError,
    stopSpeaking,
  ]);

  const handleCloseModal = useCallback(() => {
    setShowScorecardModal(false);
    if (scorecard) {
      setCurrentStep("feedback");
    }
  }, [scorecard, setCurrentStep]);

  const handleNewInterview = useCallback(() => {
    setShowScorecardModal(false);
    resetInterview();
    lastSpokenIndexRef.current = -1;
  }, [resetInterview]);

  const toggleMute = useCallback(() => {
    if (!isMuted) {
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  }, [isMuted, stopSpeaking]);

  // Determine if the last message is still streaming
  const isLastMessageStreaming =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";

  // Check if enough messages for scorecard (at least one user response)
  const hasEnoughMessages =
    messages.filter((m) => m.role === "user").length > 0;

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-140px)] max-h-[800px] bg-card rounded-xl border border-border overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToSetup}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Back to setup"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                AI Interview Session
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[400px]">
                {jobDescription.slice(0, 50)}
                {jobDescription.length > 50 ? "..." : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Dropdown */}
            {isTTSSupported && (
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors flex items-center gap-1"
                  title="Voice settings"
                >
                  <Settings className="w-4 h-4" />
                  <ChevronDown className={`w-3 h-3 transition-transform ${showSettings ? "rotate-180" : ""}`} />
                </button>
                {showSettings && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSettings(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                        AI Voice
                      </div>
                      <button
                        onClick={() => {
                          setPreferredVoice("female");
                          setShowSettings(false);
                        }}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors flex items-center justify-between ${
                          preferredVoice === "female" ? "text-primary" : "text-foreground"
                        }`}
                      >
                        Female Voice
                        {preferredVoice === "female" && (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPreferredVoice("male");
                          setShowSettings(false);
                        }}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors flex items-center justify-between ${
                          preferredVoice === "male" ? "text-primary" : "text-foreground"
                        }`}
                      >
                        Male Voice
                        {preferredVoice === "male" && (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Mute/Unmute TTS Button */}
            {isTTSSupported && (
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg transition-colors ${isMuted
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                title={isMuted ? "Unmute AI voice" : "Mute AI voice"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={handleRestartInterview}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Restart interview"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleFinishInterview}
              disabled={!hasEnoughMessages || isLoading || isSpeaking}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors"
              title={
                hasEnoughMessages
                  ? "Finish and get scorecard"
                  : "Complete at least one exchange first"
              }
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Finish Interview
            </button>
            <button
              onClick={handleEndInterview}
              className="px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg transition-colors"
            >
              Exit
            </button>
          </div>
        </div>

        {/* 3D Interviewer Scene */}
        <div className="h-[280px] sm:h-[320px] shrink-0 border-b border-border relative">
             <InterviewerScene isSpeaking={isSpeaking} />
          {/* <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

            <Suspense fallback={null}>
              <AnimatedHuman isSpeaking={isSpeaking} />
              <Text
                position={[0, -1.95, 0]} 
                fontSize={0.25} 
                color="#fff"
                anchorX="center"
                anchorY="middle"
                fontStyle="normal"
                fontWeight={600}
              >
                AI Interviewer
              </Text>
            </Suspense>
          </Canvas> */}

          {/* Speaking indicator overlay */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-primary/90 rounded-full">
              <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="text-xs text-white font-medium">Speaking...</span>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">
                Starting interview...
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  message={message}
                  isStreaming={
                    isLastMessageStreaming && index === messages.length - 1
                  }
                />
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 mx-4 my-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Error sending message
                  </p>
                  <p className="text-xs text-red-400/80 mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Finish Button + Chat Input */}
        <div className="border-t border-border">
          {/* Mobile Finish Button */}
          <div className="sm:hidden px-4 pt-3">
            <button
              onClick={handleFinishInterview}
              disabled={!hasEnoughMessages || isLoading || isSpeaking}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Finish Interview & Get Scorecard
            </button>
          </div>

          {/* User Response Input */}
          <UserResponseInput
            onSubmit={sendMessage}
            isAiThinking={isLoading}
            isAiSpeaking={isSpeaking}
            placeholder="Type your answer to the interviewer..."
          />
        </div>
      </div>

      {/* Scorecard Modal */}
      <Modal
        isOpen={showScorecardModal}
        onClose={handleCloseModal}
        title="Performance Scorecard"
        size="lg"
        closeOnOverlayClick={!isScorecardLoading}
        closeOnEscape={!isScorecardLoading}
      >
        <Scorecard
          scorecard={scorecard}
          isLoading={isScorecardLoading}
          error={scorecardError}
          onClose={handleCloseModal}
          onNewInterview={handleNewInterview}
        />
      </Modal>
    </>
  );
}
