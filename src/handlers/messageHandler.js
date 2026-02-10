import { chat, webSearch, analyzeAndRewriteScript } from "../services/claude.js";
import { findVideoUrl, detectPlatform, downloadAudio, cleanup } from "../services/mediaDownloader.js";
import { transcribe } from "../services/whisper.js";

/**
 * Check if the bot was mentioned in a group message
 */
function isBotMentioned(msg, botInfo) {
  if (!msg.text) return false;

  const botUsername = botInfo.username.toLowerCase();

  // Check for @mention
  if (msg.entities) {
    for (const entity of msg.entities) {
      if (entity.type === "mention") {
        const mention = msg.text
          .substring(entity.offset, entity.offset + entity.length)
          .toLowerCase();
        if (mention === `@${botUsername}`) {
          return true;
        }
      }
    }
  }

  // Check for reply to bot
  if (msg.reply_to_message?.from?.id === botInfo.id) {
    return true;
  }

  return false;
}

/**
 * Remove bot mention from message text
 */
function removeBotMention(text, botUsername) {
  return text.replace(new RegExp(`@${botUsername}\\s*`, "gi"), "").trim();
}

/**
 * Handle incoming messages
 */
export async function handleMessage(bot, msg, botInfo) {
  const chatId = msg.chat.id;
  const isPrivate = msg.chat.type === "private";
  const text = msg.text || "";

  // In groups, only respond if mentioned
  if (!isPrivate && !isBotMentioned(msg, botInfo)) {
    return;
  }

  // Clean up the message text
  const cleanText = isPrivate ? text : removeBotMention(text, botInfo.username);

  // Check for video URLs
  const videoUrl = findVideoUrl(cleanText);

  if (videoUrl) {
    await handleVideoAnalysis(bot, chatId, videoUrl, msg.message_id);
    return;
  }

  // Check for web search request
  if (
    cleanText.toLowerCase().startsWith("search ") ||
    cleanText.toLowerCase().startsWith("google ") ||
    cleanText.toLowerCase().startsWith("look up ")
  ) {
    await handleWebSearch(bot, chatId, cleanText, msg.message_id);
    return;
  }

  // Default: chat response
  await handleChat(bot, chatId, cleanText, msg.message_id);
}

/**
 * Handle regular chat messages
 */
async function handleChat(bot, chatId, text, replyToId) {
  try {
    await bot.sendChatAction(chatId, "typing");
    const response = await chat(text);
    await bot.sendMessage(chatId, response, {
      reply_to_message_id: replyToId,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Chat error:", error);
    await bot.sendMessage(
      chatId,
      "Sorry, I encountered an error processing your message.",
      { reply_to_message_id: replyToId }
    );
  }
}

/**
 * Handle web search requests
 */
async function handleWebSearch(bot, chatId, text, replyToId) {
  try {
    await bot.sendChatAction(chatId, "typing");

    // Extract search query
    const query = text.replace(/^(search|google|look up)\s+/i, "").trim();

    await bot.sendMessage(chatId, `Searching the web for: "${query}"...`, {
      reply_to_message_id: replyToId,
    });

    const response = await webSearch(query);

    await bot.sendMessage(chatId, response, {
      reply_to_message_id: replyToId,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Web search error:", error);
    await bot.sendMessage(
      chatId,
      "Sorry, I couldn't complete the web search.",
      { reply_to_message_id: replyToId }
    );
  }
}

/**
 * Handle video URL analysis
 */
async function handleVideoAnalysis(bot, chatId, videoUrl, replyToId) {
  const platform = detectPlatform(videoUrl);
  let audioPath = null;

  try {
    // Step 1: Notify user
    await bot.sendMessage(
      chatId,
      `Found a ${platform} link! Starting analysis...\n\n` +
        `Step 1/4: Downloading audio...`,
      { reply_to_message_id: replyToId }
    );

    // Step 2: Download audio
    await bot.sendChatAction(chatId, "record_voice");
    audioPath = await downloadAudio(videoUrl);

    await bot.sendMessage(chatId, `Step 2/4: Transcribing with Whisper...`);

    // Step 3: Transcribe
    await bot.sendChatAction(chatId, "typing");
    const transcript = await transcribe(audioPath);

    if (!transcript || transcript.trim().length === 0) {
      await bot.sendMessage(
        chatId,
        "Couldn't extract any speech from this video. It might be music-only or have no audio.",
        { reply_to_message_id: replyToId }
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `Step 3/4: Analyzing script structure...`
    );

    // Step 4: Analyze and rewrite
    await bot.sendChatAction(chatId, "typing");
    const analysis = await analyzeAndRewriteScript(transcript, platform);

    // Send results
    await bot.sendMessage(chatId, `Step 4/4: Done!\n\n` + `**Original Transcript:**\n${transcript}`, {
      parse_mode: "Markdown",
    });

    // Split long messages if needed (Telegram limit is 4096)
    if (analysis.length > 4000) {
      const chunks = splitMessage(analysis, 4000);
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
      }
    } else {
      await bot.sendMessage(chatId, analysis, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error("Video analysis error:", error);
    await bot.sendMessage(
      chatId,
      `Sorry, I couldn't analyze this video. Error: ${error.message}\n\n` +
        `This might be due to:\n` +
        `- The video being private or age-restricted\n` +
        `- Platform blocking downloads\n` +
        `- Network issues`,
      { reply_to_message_id: replyToId }
    );
  } finally {
    // Clean up temp file
    if (audioPath) {
      cleanup(audioPath);
    }
  }
}

/**
 * Split long messages
 */
function splitMessage(text, maxLength) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point
    let breakPoint = remaining.lastIndexOf("\n\n", maxLength);
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      breakPoint = remaining.lastIndexOf("\n", maxLength);
    }
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      breakPoint = remaining.lastIndexOf(" ", maxLength);
    }
    if (breakPoint === -1) {
      breakPoint = maxLength;
    }

    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trim();
  }

  return chunks;
}

export default { handleMessage };
