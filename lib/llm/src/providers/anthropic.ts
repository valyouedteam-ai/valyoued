import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { ChatTurn, LlmProvider } from "../types.js";

function toAnthropicContent(content: ChatTurn["content"]): MessageParam["content"] {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") {
      return { type: "text" as const, text: part.text };
    }
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: part.mimeType as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif",
        data: part.base64,
      },
    };
  });
}

export function createAnthropicProvider(client: Anthropic): LlmProvider {
  return {
    id: "anthropic",
    async complete({ model, maxTokens, messages }) {
      if (messages.length !== 1) {
        throw new Error(
          `Anthropic provider: expected exactly 1 user message, got ${messages.length}`,
        );
      }
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: toAnthropicContent(messages[0].content),
          },
        ],
      });
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    },
  };
}
