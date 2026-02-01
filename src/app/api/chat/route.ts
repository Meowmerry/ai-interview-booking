// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: Message[];
  jobDescription: string;
}

type Provider = "openai" | "anthropic" | "huggingface" | "ollama" | null;

// System prompt generator
function getSystemPrompt(jobDescription: string) {
  return `You are an expert technical interviewer. Based on the provided job description, conduct a realistic interview. Ask one question at a time. After the user answers, provide a very brief transition and ask the next follow-up question. Keep the tone professional but encouraging.

Job Description:
${jobDescription}

Guidelines:
- Start with a warm greeting if this is the beginning of the interview
- Ask relevant technical and behavioral questions based on the job requirements
- After each answer, acknowledge briefly (1-2 sentences max) and move to the next question
- Keep questions focused and clear
- Adapt your questions based on the candidate's responses
- Mix technical questions with situational/behavioral questions as appropriate for the role`;
}

// Detect which provider has API key
function detectProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OLLAMA_API_KEY) return "ollama";  // check Ollama before Hugging Face
  if (process.env.HUGGINGFACE_API_KEY) return "huggingface";
  return null;
}
// Format messages for Hugging Face prompt
function formatMessagesAsPrompt(messages: Message[], systemPrompt: string) {
  let prompt = `<s>[INST] ${systemPrompt}\n\n`;
  messages.forEach((msg, i) => {
    if (msg.role === "user") {
      prompt += `[INST] ${msg.content} [/INST]`;
    } else if (msg.role === "assistant") {
      prompt += ` ${msg.content}</s>`;
      if (i < messages.length - 1) prompt += "<s>";
    }
  });
  return prompt;
}

// -------------------- OpenAI Streaming --------------------
async function streamOpenAI(messages: Message[], systemPrompt: string): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          } catch { }
        }
      }
    },
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

// -------------------- Anthropic Streaming --------------------
async function streamAnthropic(messages: Message[], systemPrompt: string): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const anthropicMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta") {
              const content = parsed.delta?.text;
              if (content) controller.enqueue(encoder.encode(content));
            }
          } catch { }
        }
      }
    },
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

// -------------------- Hugging Face Fallback --------------------
async function callHuggingFace(messages: Message[], systemPrompt: string): Promise<Response> {
  const apiKey = process.env.HUGGINGFACE_API_KEY!;
  const model = process.env.HUGGINGFACE_MODEL || "mistralai/Mixtral-8x7B-Instruct-v0.1";

  const prompt = formatMessagesAsPrompt(messages, systemPrompt);

  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
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
  const generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;

  return new Response(generatedText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

// -------------------- Main POST handler --------------------
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, jobDescription } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json({ error: "jobDescription string is required" }, { status: 400 });
    }

    const provider = detectProvider();
    if (!provider) {
      return NextResponse.json(
        {
          error:
            "No API keys configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or HUGGINGFACE_API_KEY",
        },
        { status: 500 }
      );
    }

    const systemPrompt = getSystemPrompt(jobDescription);

    switch (provider) {
      case "openai":
        return await streamOpenAI(messages, systemPrompt);
      case "anthropic":
        return await streamAnthropic(messages, systemPrompt);
      case "ollama":
        return await streamOllama(messages, systemPrompt);
      case "huggingface":
        return await callHuggingFace(messages, systemPrompt);
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 500 });
    }

  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
// -------------------- Ollama Streaming --------------------
async function streamOllama(messages: Message[], systemPrompt: string): Promise<Response> {
  const model = process.env.OLLAMA_MODEL || "llama3.2:latest";

  // Determine API URL: use local if no API key, otherwise cloud
  const ollamaUrl = process.env.OLLAMA_API_URL || "http://localhost:11434/v1/completions";
  const apiKey = process.env.OLLAMA_API_KEY; // optional

  // Combine system prompt + messages into one text prompt
  const prompt = [
    `System: ${systemPrompt}`,
    ...messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
  ].join("\n");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(ollamaUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt,
      max_tokens: 1024,
      temperature: 0.7,
      stream: true
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split("\n").filter((l) => l.trim() !== "");
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const content = parsed.choices?.[0]?.text;
          if (content) controller.enqueue(encoder.encode(content));
        } catch { }
      }
    }
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

// -------------------- GET / Health check --------------------
export async function GET() {
  const provider = detectProvider();
  return NextResponse.json({
    status: "ok",
    provider: provider || "none",
    availableProviders: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY,
    },
  });
}
