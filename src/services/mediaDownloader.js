import { exec } from "yt-dlp-exec";
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// Ensure temp directory exists
const TEMP_DIR = join(process.cwd(), "temp");
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url) {
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("instagram.com")) return "Instagram";
  return null;
}

/**
 * Extract video/audio URL patterns
 */
const URL_PATTERNS = [
  // TikTok
  /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
  /https?:\/\/(?:vm|vt)\.tiktok\.com\/[\w]+/i,
  // YouTube
  /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i,
  /https?:\/\/(?:www\.)?youtube\.com\/shorts\/[\w-]+/i,
  /https?:\/\/youtu\.be\/[\w-]+/i,
  // Instagram
  /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[\w-]+/i,
];

/**
 * Find video URL in text
 */
export function findVideoUrl(text) {
  for (const pattern of URL_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

/**
 * Download audio from video URL using yt-dlp
 */
export async function downloadAudio(url) {
  const outputId = randomUUID();
  const outputPath = join(TEMP_DIR, `${outputId}.mp3`);

  try {
    console.log(`Downloading audio from: ${url}`);

    await exec(url, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0,
      output: outputPath,
      noPlaylist: true,
      // Handle cookies for some platforms
      cookies: "cookies.txt",
      // Ignore errors for missing cookies file
      ignoreerrors: true,
    });

    // Check if file was created
    if (!existsSync(outputPath)) {
      // Try alternative output path (yt-dlp sometimes adds extension)
      const altPath = join(TEMP_DIR, `${outputId}.mp3.mp3`);
      if (existsSync(altPath)) {
        return altPath;
      }
      throw new Error("Audio file was not created");
    }

    return outputPath;
  } catch (error) {
    console.error("Download error:", error);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

/**
 * Clean up temporary file
 */
export function cleanup(filePath) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log(`Cleaned up: ${filePath}`);
    }
  } catch (error) {
    console.error(`Cleanup error for ${filePath}:`, error);
  }
}

export default { detectPlatform, findVideoUrl, downloadAudio, cleanup };
