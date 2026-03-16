import { Injectable } from "@nestjs/common";
import { MsEdgeTTS, OUTPUT_FORMAT } from "edge-tts-node";
import { Readable } from "stream";

@Injectable()
export class TtsService {
  async textToSpeechStream(text: string): Promise<Readable> {
    const tts = new MsEdgeTTS({ enableLogger: false });
    await tts.setMetadata(
      "en-US-AriaNeural",
      OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
    );
    return tts.toStream(text);
  }

  async textToSpeechBuffer(text: string): Promise<Buffer> {
    try {
      const stream = await this.textToSpeechStream(text);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (e: unknown) {
      const err = e as Error;
      const msg = err?.message ?? String(e);
      if (msg.includes("Connect Error") || msg.includes("403") || msg.includes("503")) {
        throw new Error(
          "Edge TTS connection failed. Microsoft speech.platform.bing.com may be blocked in your region or network. " +
            "Try using browser TTS (uncheck 'Use Edge TTS') or a VPN/proxy."
        );
      }
      throw e;
    }
  }
}
