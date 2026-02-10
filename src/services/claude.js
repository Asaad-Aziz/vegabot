import Anthropic from "@anthropic-ai/sdk";
import { brandConfig } from "../config/brand.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Chat with Claude, optionally using web search
 */
export async function chat(userMessage, useWebSearch = false) {
  const systemPrompt = `${brandConfig.role}

معلومات المنتج:
${brandConfig.product.name} - ${brandConfig.product.type}
المميزات: ${brandConfig.product.features.join("، ")}
USP: ${brandConfig.product.usp}

صوت البراند:
- Tone: ${brandConfig.brandVoice.tone}
- Personality: ${brandConfig.brandVoice.personality.join("، ")}

${brandConfig.botBehavior}`;

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
  const pillarsText = brandConfig.contentPillars
    .map(p => `- ${p.name}: ${p.description} (Goal: ${p.goal})`)
    .join("\n");

  const systemPrompt = `انت المدير الإبداعي لفريق تسويق ${brandConfig.product.name}.

معلومات المنتج:
${brandConfig.product.name} - ${brandConfig.product.type}
المميزات: ${brandConfig.product.features.join("، ")}
USP: ${brandConfig.product.usp}

صوت البراند:
- Tone: ${brandConfig.brandVoice.tone}
- Personality: ${brandConfig.brandVoice.personality.join("، ")}
- أمثلة: ${brandConfig.brandVoice.examples.join(" | ")}

Content Pillars:
${pillarsText}

Script Structure:
- Hook: ${brandConfig.scriptStructure.hook}
- Body: ${brandConfig.scriptStructure.body}
- CTA: ${brandConfig.scriptStructure.cta}
- Length (TikTok/Reels): ${brandConfig.scriptStructure.length.tiktokReels}

تجنب:
${brandConfig.avoid.join("، ")}`;

  const userPrompt = `الفريق أرسل لك فيديو من ${originalPlatform}.

المطلوب:
1. **تحليل السكربت الأصلي:**
   - الهوك - شنو استخدموا؟
   - البنية والـ pacing
   - ليش الفيديو شغال (أو ما شغال)

2. **اكتب نسخة Vega Power:**
   - نفس الـ structure اللي شغالة
   - بصوت براندنا
   - جاهز للتصوير
   - قسمه: HOOK | BODY | CTA
   - اقترح ٢-٣ variations للهوك

الترانسكربت:

---
${transcript}
---`;

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
