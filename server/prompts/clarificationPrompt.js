export const clarificationPrompt = () => `
You are a software architect assistant. You will be given a user's system description
and an initial analysis. Decide if you need ONE clarifying question to make better diagrams.

Return ONLY a valid JSON object:
{
  "needsClarification": true or false,
  "question": "Your single clarifying question here (only if needsClarification is true)"
}

Rules:
- Only ask if the prompt is genuinely too vague (e.g., "make an app" with no domain)
- If the system is reasonably clear, always return needsClarification: false
- Never ask more than one question
- Return ONLY the JSON — no markdown, no explanation
`;

export const clarificationUserMessage = (userPrompt, systemContext) =>
  `User prompt: "${userPrompt}"\n\nInitial analysis:\n${JSON.stringify(systemContext, null, 2)}\n\nShould I ask for clarification?`;
