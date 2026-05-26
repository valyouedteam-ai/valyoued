import OpenAI from "openai";
import type { ChatTurn, LlmProvider } from "../types.js";

/**
 * Some Chat Completions models return 400 for `max_tokens` and expect
 * `max_completion_tokens` (o-series reasoning, GPT-5 family, GPT-4.1, etc.).
 */
function openAiPrefersMaxCompletionTokens(model: string): boolean {
  const forced = process.env.OPENAI_USE_MAX_COMPLETION_TOKENS?.trim().toLowerCase();
  if (forced === "1" || forced === "true" || forced === "yes") return true;
  if (forced === "0" || forced === "false" || forced === "no") return false;

  const m = model.trim().toLowerCase();
  if (m.startsWith("gpt-5")) return true;
  if (m.startsWith("gpt-4.1")) return true;
  if (/^o\d/i.test(m)) return true;

  return false;
}

function toOpenAiUserContent(
  content: ChatTurn["content"],
): OpenAI.Chat.Completions.ChatCompletionContentPart[] | string {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") {
      return { type: "text" as const, text: part.text };
    }
    return {
      type: "image_url" as const,
      image_url: {
        url: `data:${part.mimeType};base64,${part.base64}`,
      },
    };
  });
}

export function createOpenAiProvider(client: OpenAI): LlmProvider {
  return {
    id: "openai",
    async complete({ model, maxTokens, messages }) {
      if (messages.length !== 1) {
        throw new Error(
          `OpenAI provider: expected exactly 1 user message, got ${messages.length}`,
        );
      }
      const userContent = toOpenAiUserContent(messages[0].content);
      const res = await client.chat.completions.create({
        model,
        ...(openAiPrefersMaxCompletionTokens(model)
          ? { max_completion_tokens: maxTokens }
          : { max_tokens: maxTokens }),
        messages: [{ role: "user", content: userContent }],
      });
      const out = res.choices[0]?.message?.content;
      if (out == null) {
        throw new Error("OpenAI returned empty assistant content");
      }
      if (typeof out === "string") return out;
      const asArray = out as unknown;
      if (Array.isArray(asArray)) {
        return (asArray as { type?: string; text?: string }[])
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => p.text!)
          .join("");
      }
      throw new Error("OpenAI returned unexpected assistant content shape");
    },
  };
}
