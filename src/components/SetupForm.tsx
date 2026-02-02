"use client";

import { useCallback } from "react";
import {
  Code,
  ListChecks,
  Users,
  Cpu,
  UserCircle,
  Briefcase,
  Volume2,
  Clock,
  Target,
  Layers,
  AlertCircle,
  Play,
} from "lucide-react";
import { useInterviewStore } from "@/store/useInterviewStore";
import type {
  InterviewType,
  DifficultyLevel,
  InterviewDuration,
} from "@/store/useInterviewStore";

const interviewTypeOptions: {
  id: InterviewType;
  label: string;
  description: string;
  icon: typeof Code;
}[] = [
  {
    id: "coding",
    label: "Coding",
    description: "Live coding challenges",
    icon: Code,
  },
  {
    id: "multiple-choice",
    label: "Multiple Choice",
    description: "Quiz-style questions",
    icon: ListChecks,
  },
  {
    id: "behavioral",
    label: "Behavioral",
    description: "Situational questions",
    icon: Users,
  },
  {
    id: "technical",
    label: "Technical",
    description: "Deep technical concepts",
    icon: Cpu,
  },
  {
    id: "hr",
    label: "HR",
    description: "Culture fit & soft skills",
    icon: UserCircle,
  },
  {
    id: "hiring-manager",
    label: "Hiring Manager",
    description: "Leadership & vision",
    icon: Briefcase,
  },
];

const difficultyOptions: { id: DifficultyLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const durationOptions: { value: InterviewDuration; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

interface SetupFormProps {
  onStartInterview: () => void;
}

export default function SetupForm({ onStartInterview }: SetupFormProps) {
  const {
    jobDescription,
    setJobDescription,
    preferredVoice,
    setPreferredVoice,
    interviewTypes,
    toggleInterviewType,
    difficulty,
    setDifficulty,
    duration,
    setDuration,
  } = useInterviewStore();

  const isValid = interviewTypes.length > 0;

  const handleStart = useCallback(() => {
    if (isValid) {
      onStartInterview();
    }
  }, [isValid, onStartInterview]);

  return (
    <div className="bg-card rounded-xl p-6 sm:p-8 border border-border shadow-lg space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Interview Setup</h2>
        <p className="text-muted-foreground">
          Configure your mock interview session
        </p>
      </div>

      {/* Job Description */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          Job Description (Optional)
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here to customize your interview questions..."
          className="w-full h-32 bg-secondary border border-border rounded-lg p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
        />
      </div>

      {/* Interview Types - Multi-select Grid */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Interview Type
          <span className="text-xs text-muted-foreground font-normal">
            (Select one or more)
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {interviewTypeOptions.map((option) => {
            const isSelected = interviewTypes.includes(option.id);
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleInterviewType(option.id)}
                className={`relative p-4 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary ring-1 ring-primary"
                    : "bg-secondary/50 border-border hover:border-primary/50 hover:bg-secondary"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? "bg-primary/20" : "bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {option.description}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
        {interviewTypes.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-500">
            <AlertCircle className="w-3.5 h-3.5" />
            Please select at least one interview type
          </p>
        )}
      </div>

      {/* Difficulty - Segmented Control */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Target className="w-4 h-4 text-muted-foreground" />
          Difficulty Level
        </label>
        <div className="inline-flex p-1 bg-secondary rounded-lg border border-border">
          {difficultyOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDifficulty(option.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                difficulty === option.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration - Toggle Group */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Session Duration
        </label>
        <div className="flex gap-3">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDuration(option.value)}
              className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                duration === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border hover:border-primary/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          AI Interviewer Voice
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPreferredVoice("female")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
              preferredVoice === "female"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border hover:border-primary/50"
            }`}
          >
            Female Voice
          </button>
          <button
            type="button"
            onClick={() => setPreferredVoice("male")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
              preferredVoice === "male"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border hover:border-primary/50"
            }`}
          >
            Male Voice
          </button>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!isValid}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-medium py-3.5 px-6 rounded-lg transition-colors text-base"
      >
        <Play className="w-5 h-5" />
        Start Interview
      </button>

      {/* Summary */}
      {isValid && (
        <div className="p-4 bg-secondary/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Session summary:</span>{" "}
            {interviewTypes.length} interview type{interviewTypes.length > 1 ? "s" : ""} •{" "}
            {difficulty} difficulty • {duration} minutes
          </p>
        </div>
      )}
    </div>
  );
}
