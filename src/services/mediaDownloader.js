import { spawn } from "child_process";
import { existsSync, mkdirSync, unlinkSync, readdirSync } from "fs";
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
 * Run yt-dlp command using system binary
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const process = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });

    process.on("error", (err) => {
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });
  });
}

/**
 * Download audio from video URL using yt-dlp
 */
export async function downloadAudio(url) {
  const outputId = randomUUID();
  const outputTemplate = join(TEMP_DIR, `${outputId}.%(ext)s`);

  try {
    console.log(`Downloading audio from: ${url}`);

    const args = [
      "-x",                          // Extract audio
      "--audio-format", "mp3",       // Convert to mp3
      "--audio-quality", "0",        // Best quality
      "-o", outputTemplate,          // Output template
      "--no-playlist",               // Single video only
      "--no-warnings",               // Suppress warnings
      url
    ];

    await runYtDlp(args);

    // Find the output file (yt-dlp replaces %(ext)s with actual extension)
    const files = readdirSync(TEMP_DIR);
    const outputFile = files.find(f => f.startsWith(outputId));

    if (!outputFile) {
      throw new Error("Audio file was not created");
    }

    const outputPath = join(TEMP_DIR, outputFile);
    console.log(`Downloaded: ${outputPath}`);
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
