/**
 * One user turn. (Assistant turns can be added when a flow needs multi-step chat.)
 */
export type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; base64: string; mimeType: string }
    >;

export interface ChatTurn {
  role: "user";
  content: ChatContent;
}

/** Built-in providers; add a new id + factory branch to support another vendor. */
export type LlmProviderId = "anthropic" | "openai";

export interface LlmProvider {
  readonly id: LlmProviderId;
  /**
   * Single user message today (all ValYoued call sites). Extend/adapt here if you add multi-turn.
   */
  complete(params: {
    model: string;
    maxTokens: number;
    messages: ChatTurn[];
  }): Promise<string>;
}
