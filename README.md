# Vega Bot

Telegram bot with AI-powered chat, web search, and video script analysis.

## Features

- **AI Chat**: Responds to messages using Claude with your brand voice
- **Web Search**: Search the web with "search [query]"
- **Video Script Analysis**: Share TikTok/YouTube/Instagram links to:
  - Download and transcribe audio with Whisper
  - Analyze script structure
  - Rewrite in your brand voice

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Install system dependencies (for video downloads):
   - **Windows**: Download [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) and [ffmpeg](https://ffmpeg.org/download.html), add to PATH
   - **Mac**: `brew install yt-dlp ffmpeg`
   - **Linux**: `apt install yt-dlp ffmpeg`

3. Create `.env` file with your API keys (see `.env.example`)

4. Run the bot:
```bash
npm start
```

## Deploy to Railway

1. Push to GitHub

2. Create new project on [Railway](https://railway.app)

3. Connect your GitHub repo

4. Add environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`

5. Deploy!

## Customization

Edit `src/config/brand.js` to customize:
- Brand name and description
- Voice and tone
- Target audience
- Content style guidelines
- Script writing rules

## Usage

**In DMs**: Just send any message

**In Groups**: Mention the bot with @username

**Commands**:
- `/start` - Welcome message
- `/help` - Help information
- `search [query]` - Web search
- Share a video link - Script analysis
