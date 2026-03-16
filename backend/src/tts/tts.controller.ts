import { Body, Controller, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { TtsService } from "./tts.service";

class TtsDto {
  text?: string;
}

@Controller()
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post("tts")
  async tts(@Body() body: TtsDto, @Res() res: Response) {
    const text = String(body?.text ?? "").trim();
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    try {
      const buffer = await this.ttsService.textToSpeechBuffer(text);
      res.setHeader("Content-Type", "audio/webm");
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (e: unknown) {
      const err = e as Error;
      res.status(500).json({ error: err?.message ?? String(e) });
    }
  }
}
