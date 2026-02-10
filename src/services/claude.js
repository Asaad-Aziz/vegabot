import Anthropic from "@anthropic-ai/sdk";
import { brandConfig } from "../config/brand.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Chat with Claude, optionally using web search
 */
export async function chat(userMessage, useWebSearch = false) {
  const systemPrompt = `You are ${brandConfig.name}'s AI assistant.

Brand Context:
${brandConfig.description}

Voice & Tone: ${brandConfig.voice.tone}
Personality traits: ${brandConfig.voice.personality.join(", ")}

Keep responses helpful, concise, and on-brand. If asked about the brand, reference the context above.`;

  const tools = useWebSearch
    ? [{ type: "web_search_20250305", name: "web_search" }]
    : [];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract text from response
    let textContent = "";
    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      }
    }

    return textContent || "I couldn't generate a response.";
  } catch (error) {
    console.error("Claude API error:", error);
    throw error;
  }
}

/**
 * Search the web and respond using Claude
 */
export async function webSearch(query) {
  return chat(`Search the web for: ${query}`, true);
}

/**
 * Analyze a transcript and rewrite it in brand voice
 */
export async function analyzeAndRewriteScript(transcript, originalPlatform) {
  const systemPrompt = `You are an expert script writer and content strategist for ${brandConfig.name}.

Brand Voice:
- Tone: ${brandConfig.voice.tone}
- Personality: ${brandConfig.voice.personality.join(", ")}
- Words to avoid: ${brandConfig.voice.avoidWords.join(", ")}
- Preferred vocabulary: ${brandConfig.voice.preferredWords.join(", ")}

Target Audience:
- Demographics: ${brandConfig.audience.demographics}
- Interests: ${brandConfig.audience.interests.join(", ")}

Content Style:
- Hooks: ${brandConfig.contentStyle.hooks}
- Structure: ${brandConfig.contentStyle.structure}
- Length: ${brandConfig.contentStyle.length}

Script Guidelines:
${brandConfig.scriptGuidelines}`;

  const userPrompt = `I have a transcript from a ${originalPlatform} video. Please:

1. **ANALYZE** the original script structure:
   - Identify the hook
   - Break down the main points
   - Note the pacing and transitions
   - Identify what makes it engaging (or not)

2. **REWRITE** the script in our brand voice:
   - Keep what works from the original
   - Adapt the messaging to our brand
   - Make it feel authentic to ${brandConfig.name}
   - Include timing notes if helpful

Here's the transcript:

---
${transcript}
---

Please provide both the analysis and the rewritten script.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    let textContent = "";
    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      }
    }

    return textContent;
  } catch (error) {
    console.error("Script analysis error:", error);
    throw error;
  }
}

export default { chat, webSearch, analyzeAndRewriteScript };
