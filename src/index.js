import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { handleMessage } from "./handlers/messageHandler.js";
import { brandConfig } from "./config/brand.js";

// Validate environment variables
const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

let botInfo = null;

// Get bot info on startup
bot.getMe().then((info) => {
  botInfo = info;
  console.log(`
╔════════════════════════════════════════════╗
║     ${brandConfig.name} Bot Started!
╠════════════════════════════════════════════╣
║  Username: @${info.username}
║  Bot ID: ${info.id}
╠════════════════════════════════════════════╣
║  Features:
║  - Chat in DMs or mention in groups
║  - Web search (say "search <query>")
║  - Video script analysis (share a link)
║    Supports: TikTok, YouTube, Instagram
╚════════════════════════════════════════════╝
  `);
});

// Handle incoming messages
bot.on("message", async (msg) => {
  // Skip if we don't have bot info yet
  if (!botInfo) return;

  // Skip non-text messages (for now)
  if (!msg.text) return;

  try {
    await handleMessage(bot, msg, botInfo);
  } catch (error) {
    console.error("Message handling error:", error);
  }
});

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
Welcome to the ${brandConfig.name} Bot!

**What I can do:**

**Chat & Answer Questions**
Just send me a message or mention me in a group (@${botInfo?.username || "bot"})

**Web Search**
Say "search [your query]" and I'll look it up

**Video Script Analysis**
Share a TikTok, YouTube, or Instagram link and I'll:
- Download and transcribe the audio
- Analyze the script structure
- Rewrite it in our brand voice

Try it out!
  `.trim();

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
**${brandConfig.name} Bot Help**

**Commands:**
/start - Welcome message
/help - This help message

**Features:**

**1. Chat**
Just send any message and I'll respond using our brand voice.

**2. Web Search**
Start your message with:
- "search [query]"
- "google [query]"
- "look up [query]"

**3. Video Analysis**
Simply share a link from:
- TikTok
- YouTube (videos & shorts)
- Instagram (reels & posts)

I'll transcribe the audio and rewrite the script in our brand voice!

**In Groups:**
Mention me @${botInfo?.username || "bot"} to get my attention.
  `.trim();

  await bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
});

// Handle polling errors
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.code, error.message);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down bot...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down bot...");
  bot.stopPolling();
  process.exit(0);
});
