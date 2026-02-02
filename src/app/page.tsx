"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { useInterviewStore } from "@/store/useInterviewStore";
import { Briefcase, MessageSquare, CheckCircle } from "lucide-react";
import SetupForm from "@/components/SetupForm";

// Dynamic imports for components with Three.js to avoid SSR issues
const InterviewerScene = dynamic(
  () => import("@/components/InterviewerScene"),
  { ssr: false }
);

const InterviewPage = dynamic(() => import("@/components/InterviewPage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-card rounded-xl border border-border">
      <div className="text-muted-foreground">Loading interview...</div>
    </div>
  ),
});

export default function Home() {
  const {
    currentStep,
    messages,
    setCurrentStep,
    clearMessages,
    resetInterview,
  } = useInterviewStore();

  const handleStartInterview = useCallback(() => {
    clearMessages();
    setCurrentStep("interviewing");
  }, [clearMessages, setCurrentStep]);

  const steps = [
    { id: "setup", label: "Setup", icon: Briefcase },
    { id: "interviewing", label: "Interview", icon: MessageSquare },
    { id: "feedback", label: "Feedback", icon: CheckCircle },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <step.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 h-0.5 bg-border mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Setup Step */}
        {currentStep === "setup" && (
          <SetupForm onStartInterview={handleStartInterview} />
        )}

        {/* Interview Step - Full InterviewPage Component */}
        {currentStep === "interviewing" && <InterviewPage />}

        {/* Feedback Step */}
        {currentStep === "feedback" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3D Scene in feedback mode */}
            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="h-[350px]">
                <InterviewerScene isSpeaking={false} />
              </div>
              <div className="p-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Interview Complete
                </span>
              </div>
            </div>

            {/* Feedback Content */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
              <h2 className="text-xl font-bold mb-4">Interview Feedback</h2>
              <p className="text-muted-foreground mb-4">
                Review your interview performance below.
              </p>

              {/* Conversation Summary */}
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {messages.length > 0 ? (
                  <>
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <h3 className="font-medium mb-2">Conversation Summary</h3>
                      <p className="text-sm text-muted-foreground">
                        Total exchanges: {messages.length} messages
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your responses:{" "}
                        {messages.filter((m) => m.role === "user").length}
                      </p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <h3 className="font-medium mb-2">Interview Transcript</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {messages.slice(-6).map((msg, i) => (
                          <div key={i} className="text-sm">
                            <span
                              className={
                                msg.role === "assistant"
                                  ? "text-primary font-medium"
                                  : "text-accent font-medium"
                              }
                            >
                              {msg.role === "assistant" ? "Interviewer" : "You"}:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {msg.content.slice(0, 100)}
                              {msg.content.length > 100 ? "..." : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">No Interview Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete an interview session to see your feedback here.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={resetInterview}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
