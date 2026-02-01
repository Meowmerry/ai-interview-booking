"use client";

import {
  Trophy,
  Target,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { ScorecardResponse } from "@/app/api/scorecard/route";

interface ScorecardProps {
  scorecard: ScorecardResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onNewInterview: () => void;
}

function ScoreCircle({
  score,
  label,
  size = "lg",
}: {
  score: number;
  label: string;
  size?: "sm" | "lg";
}) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400 border-green-400/30 bg-green-400/10";
    if (score >= 6)
      return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
    return "text-red-400 border-red-400/30 bg-red-400/10";
  };

  const sizeClasses =
    size === "lg"
      ? "w-24 h-24 text-3xl font-bold"
      : "w-16 h-16 text-xl font-semibold";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizeClasses} rounded-full border-2 flex items-center justify-center ${getScoreColor(
          score
        )}`}
      >
        {score}
      </div>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function ScoreSection({
  title,
  icon: Icon,
  score,
  feedback,
  strengths,
  improvements,
}: {
  title: string;
  icon: LucideIcon;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <ScoreCircle score={score} label="Score" size="sm" />
      </div>

      <p className="text-sm text-muted-foreground">{feedback}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-green-400 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {strengths.map((strength, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/80 flex items-start gap-2"
                >
                  <span className="text-green-400 mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas to Improve */}
        {improvements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-yellow-400 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              To Improve
            </h4>
            <ul className="space-y-1">
              {improvements.map((improvement, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/80 flex items-start gap-2"
                >
                  <span className="text-yellow-400 mt-1">•</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Scorecard({
  scorecard,
  isLoading,
  error,
  onClose,
  onNewInterview,
}: ScorecardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            Analyzing Your Interview
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Our AI is reviewing your responses and generating feedback...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            Unable to Generate Scorecard
          </h3>
          <p className="text-sm text-red-400 mt-1">{error}</p>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onNewInterview}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!scorecard) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Overall Score */}
      <div className="text-center space-y-4 pb-6 border-b border-border">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            Performance Scorecard
          </h2>
        </div>
        <ScoreCircle
          score={scorecard.overallScore}
          label="Overall Score"
          size="lg"
        />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {scorecard.summary}
        </p>
      </div>

      {/* Score Sections */}
      <div className="space-y-4">
        <ScoreSection
          title="Technical Accuracy"
          icon={Target}
          score={scorecard.technicalAccuracy.score}
          feedback={scorecard.technicalAccuracy.feedback}
          strengths={scorecard.technicalAccuracy.strengths}
          improvements={scorecard.technicalAccuracy.improvements}
        />

        <ScoreSection
          title="Communication Skills"
          icon={MessageSquare}
          score={scorecard.communicationSkills.score}
          feedback={scorecard.communicationSkills.feedback}
          strengths={scorecard.communicationSkills.strengths}
          improvements={scorecard.communicationSkills.improvements}
        />
      </div>

      {/* Key Areas for Improvement */}
      {scorecard.keyAreasForImprovement.length > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Key Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {scorecard.keyAreasForImprovement.map((area, i) => (
              <li
                key={i}
                className="text-sm text-foreground/80 flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-medium flex items-center justify-center">
                  {i + 1}
                </span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors border border-border"
        >
          View Feedback Details
        </button>
        <button
          onClick={onNewInterview}
          className="flex-1 px-4 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Start New Interview
        </button>
      </div>
    </div>
  );
}
