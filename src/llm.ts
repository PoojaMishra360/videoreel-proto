import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { z, ZodType } from "zod";

export type Cost = { stage: string; inTokens: number; outTokens: number };
export const costLedger: Cost[] = [];

const key = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const configuredProvider = process.env.LLM_PROVIDER?.trim().toLowerCase();
if (configuredProvider && configuredProvider !== "openai" && configuredProvider !== "gemini") {
  throw new Error("LLM_PROVIDER must be either openai or gemini.");
}
const useOpenAI = configuredProvider ? configuredProvider === "openai" : !!openaiKey;
if ((useOpenAI && !openaiKey) || (!useOpenAI && !key)) {
  console.error("Set GEMINI_API_KEY or OPENAI_API_KEY in .env");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: key ?? "unset", httpOptions: { timeout: 60000 } });
const openaiModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

async function openaiChat(stage: string, system: string, prompt: string, json: boolean): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: openaiModel,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`);
  costLedger.push({ stage, inTokens: data.usage?.prompt_tokens ?? 0, outTokens: data.usage?.completion_tokens ?? 0 });
  return data.choices?.[0]?.message?.content ?? "";
}

// OpenAI is primary when its key is set; otherwise Gemini is used.
const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

const fallbacks = (process.env.GEMINI_FALLBACKS ?? "gemini-3.7-flash,gemini-3.5-flash").split(",");

async function call(req: Parameters<typeof ai.models.generateContent>[0]) {
  const models = [req.model, ...fallbacks];
  for (let i = 0; ; i++) {
    const m = models[Math.min(i, models.length - 1)];
    try {
      return await ai.models.generateContent({ ...req, model: m });
    } catch (e: any) {
      const retryable = [404, 429, 500, 503, 504].includes(e?.status) || e instanceof TypeError;
      if (!retryable || i >= 7) throw e;
      const wait = Math.min(2000 * 2 ** i, 15000);
      console.warn(`  ${m} -> ${e.status ?? e.cause?.code ?? "network error"}, trying ${models[Math.min(i + 1, models.length - 1)]} in ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

function track(stage: string, r: any) {
  costLedger.push({
    stage,
    inTokens: r.usageMetadata?.promptTokenCount ?? 0,
    outTokens: r.usageMetadata?.candidatesTokenCount ?? 0,
  });
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(t);
}

export async function generateJson<T>(stage: string, system: string, prompt: string, schema: ZodType<T>): Promise<T> {
  let lastErr: unknown;
  let extra = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    let text: string;
    if (useOpenAI) {
      text = await openaiChat(stage, system, prompt + extra + "\n\nReturn only JSON.", true);
    } else {
      const r = await call({
        model,
        contents: prompt + extra,
        config: { systemInstruction: system, responseMimeType: "application/json" },
      });
      track(stage, r);
      text = r.text ?? "";
    }
    try {
      return schema.parse(extractJson(text));
    } catch (e) {
      lastErr = e;
      extra = `\n\nYour previous reply was invalid (${String(e).slice(0, 300)}). Return only valid JSON matching the requested shape.`;
    }
  }
  throw new Error(`${stage}: invalid JSON after retries: ${lastErr}`);
}

export async function generateText(stage: string, system: string, prompt: string): Promise<string> {
  if (useOpenAI) return openaiChat(stage, system, prompt, false);
  const r = await call({ model, contents: prompt, config: { systemInstruction: system } });
  track(stage, r);
  return r.text ?? "";
}

export type Source = { title: string; url: string };

export async function groundedSearch(stage: string, prompt: string): Promise<{ text: string; sources: Source[] }> {
  const r = await call({
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  track(stage, r);
  const chunks = (r.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) as any[];
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const c of chunks) {
    const url = c.web?.uri;
    if (url && !seen.has(url)) {
      seen.add(url);
      sources.push({ title: c.web?.title ?? url, url });
    }
  }
  return { text: r.text ?? "", sources };
}

export { z };

