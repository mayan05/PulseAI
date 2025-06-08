import type { Request, Response } from "express";
import type { ChatMessage } from "../types/chat";

export const handleMockChat = (req: Request, res: Response) => {
  const { messages, model }: { messages: ChatMessage[]; model: string } = req.body;

  const lastMessage = messages[messages.length - 1]?.content || "nothing";

  res.json({
    response: {
      role: "assistant",
      content: `Pretending to answer: "${lastMessage}" with model ${model || "mock-gpt"}`,
    },
  });
};