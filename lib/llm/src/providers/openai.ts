import OpenAI from "openai";
import type { ChatTurn, LlmProvider } from "../types.js";

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
        max_tokens: maxTokens,
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
