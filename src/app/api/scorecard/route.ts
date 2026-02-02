import { NextRequest, NextResponse } from "next/server";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ScorecardRequest {
  messages: Message[];
  jobDescription?: string;
  interviewTypes?: string[];
  difficulty?: string;
}

export interface ScorecardResponse {
  technicalAccuracy: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  communicationSkills: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  overallScore: number;
  keyAreasForImprovement: string[];
  summary: string;
}

type Provider = "openai" | "anthropic" | "huggingface" | null;

function detectProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.HUGGINGFACE_API_KEY) return "huggingface";
  return null;
}

function getScorecardPrompt(
  messages: Message[],
  jobDescription?: string,
  interviewTypes?: string[],
  difficulty?: string
): string {
  const conversation = messages
    .map((msg) => {
      const role = msg.role === "assistant" ? "Interviewer" : "Candidate";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  const typeDescriptions: Record<string, string> = {
    coding: "coding challenges",
    "multiple-choice": "quiz-style questions",
    behavioral: "behavioral questions",
    technical: "technical concepts",
    hr: "HR/culture fit",
    "hiring-manager": "leadership/vision",
  };

  const selectedTypes = interviewTypes?.map((t) => typeDescriptions[t] || t).join(", ") || "general interview";
  const difficultyLevel = difficulty || "intermediate";

  let contextSection = "";
  if (jobDescription?.trim()) {
    contextSection = `Job Description:\n${jobDescription}\n\n`;
  }

  return `You are an expert interview coach and assessor. Analyze the following mock interview conversation and provide a detailed performance scorecard.

${contextSection}Interview Type: ${selectedTypes}
Difficulty Level: ${difficultyLevel}

Interview Conversation:
${conversation}

Based on this interview, provide a JSON scorecard with the following structure. Be constructive, specific, and actionable in your feedback. Scores should be from 1-10.

{
  "technicalAccuracy": {
    "score": <1-10>,
    "feedback": "<2-3 sentences about technical performance>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"]
  },
  "communicationSkills": {
    "score": <1-10>,
    "feedback": "<2-3 sentences about communication>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"]
  },
  "overallScore": <1-10>,
  "keyAreasForImprovement": [
    "<specific actionable improvement 1>",
    "<specific actionable improvement 2>",
    "<specific actionable improvement 3>"
  ],
  "summary": "<3-4 sentence overall assessment and encouragement>"
}

Respond ONLY with the JSON object, no additional text.`;
}

async function callOpenAI(prompt: string): Promise<ScorecardResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return parseScorecard(content);
}

async function callAnthropic(prompt: string): Promise<ScorecardResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No content in Anthropic response");
  }

  return parseScorecard(content);
}

async function callHuggingFace(prompt: string): Promise<ScorecardResponse> {
  const model =
    process.env.HUGGINGFACE_MODEL || "mistralai/Mixtral-8x7B-Instruct-v0.1";

  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${prompt} [/INST]`,
        parameters: {
          max_new_tokens: 2048,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  let content = "";

  if (Array.isArray(result)) {
    content = result[0]?.generated_text || "";
  } else if (result.generated_text) {
    content = result.generated_text;
  }

  if (!content) {
    throw new Error("No content in Hugging Face response");
  }

  return parseScorecard(content);
}

function parseScorecard(content: string): ScorecardResponse {
  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Handle potential markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object in the response
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate and provide defaults
    return {
      technicalAccuracy: {
        score: Math.min(10, Math.max(1, parsed.technicalAccuracy?.score || 5)),
        feedback:
          parsed.technicalAccuracy?.feedback || "No feedback available.",
        strengths: parsed.technicalAccuracy?.strengths || [],
        improvements: parsed.technicalAccuracy?.improvements || [],
      },
      communicationSkills: {
        score: Math.min(
          10,
          Math.max(1, parsed.communicationSkills?.score || 5)
        ),
        feedback:
          parsed.communicationSkills?.feedback || "No feedback available.",
        strengths: parsed.communicationSkills?.strengths || [],
        improvements: parsed.communicationSkills?.improvements || [],
      },
      overallScore: Math.min(10, Math.max(1, parsed.overallScore || 5)),
      keyAreasForImprovement: parsed.keyAreasForImprovement || [],
      summary: parsed.summary || "Interview assessment completed.",
    };
  } catch {
    // Return a default scorecard if parsing fails
    return {
      technicalAccuracy: {
        score: 5,
        feedback:
          "Unable to fully assess technical accuracy from the conversation.",
        strengths: ["Participated in the interview"],
        improvements: ["Provide more detailed technical responses"],
      },
      communicationSkills: {
        score: 5,
        feedback: "Communication skills could not be fully evaluated.",
        strengths: ["Engaged with the interviewer"],
        improvements: ["Elaborate more on your answers"],
      },
      overallScore: 5,
      keyAreasForImprovement: [
        "Continue practicing mock interviews",
        "Prepare specific examples from your experience",
        "Research the company and role thoroughly",
      ],
      summary:
        "Thank you for completing this mock interview. Continue practicing to improve your interview skills.",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ScorecardRequest = await request.json();
    const { messages, jobDescription, interviewTypes, difficulty } = body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const provider = detectProvider();

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "No API keys configured. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, or HUGGINGFACE_API_KEY",
        },
        { status: 500 }
      );
    }

    const prompt = getScorecardPrompt(messages, jobDescription, interviewTypes, difficulty);
    let scorecard: ScorecardResponse;

    switch (provider) {
      case "openai":
        scorecard = await callOpenAI(prompt);
        break;
      case "anthropic":
        scorecard = await callAnthropic(prompt);
        break;
      case "huggingface":
        scorecard = await callHuggingFace(prompt);
        break;
      default:
        throw new Error("Unknown provider");
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error("Scorecard API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
