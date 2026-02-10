import OpenAI from "openai";
import { createReadStream } from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio file using OpenAI Whisper
 */
export async function transcribe(audioFilePath) {
  try {
    console.log(`Transcribing: ${audioFilePath}`);

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioFilePath),
      model: "whisper-1",
      response_format: "text",
    });

    console.log("Transcription complete");
    return transcription;
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Transcribe with timestamps for detailed analysis
 */
export async function transcribeWithTimestamps(audioFilePath) {
  try {
    console.log(`Transcribing with timestamps: ${audioFilePath}`);

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioFilePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    console.log("Detailed transcription complete");
    return transcription;
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

export default { transcribe, transcribeWithTimestamps };
