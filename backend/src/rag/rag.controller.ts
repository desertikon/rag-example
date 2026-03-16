import {
  Body,
  Controller,
  Post,
  Res,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { RagService } from "./rag.service";

class AskDto {
  question?: string;
  topK?: number;
}

@Controller()
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post("index")
  async index() {
    try {
      return await this.ragService.indexDocuments();
    } catch (e: unknown) {
      const err = e as Error;
      throw new HttpException(
        { ok: false, error: err?.message ?? String(e) },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("ask")
  async ask(@Body() body: AskDto) {
    const question = String(body?.question ?? "").trim();
    if (!question) {
      throw new BadRequestException({ ok: false, error: "question is required" });
    }

    try {
      const topK = Number(body?.topK ?? 4);
      return await this.ragService.ask(question, topK);
    } catch (e: unknown) {
      const err = e as Error;
      throw new HttpException(
        { ok: false, error: err?.message ?? String(e) },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("ask-stream")
  async askStream(@Body() body: AskDto, @Res() res: Response) {
    const question = String(body?.question ?? "").trim();
    if (!question) {
      throw new BadRequestException({ ok: false, error: "question is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const topK = Number(body?.topK ?? 4);
      for await (const event of this.ragService.askStream(question, topK)) {
        if (event.type === "chunk") {
          res.write(`data: ${JSON.stringify({ chunk: event.chunk })}\n\n`);
        } else if (event.type === "sources") {
          res.write(`data: ${JSON.stringify({ sources: event.sources })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
    } catch (e: unknown) {
      const err = e as Error;
      res.write(
        `data: ${JSON.stringify({ error: err?.message ?? String(e) })}\n\n`
      );
    } finally {
      res.end();
    }
  }

  @Post("ask-tools")
  async askTools(@Body() body: AskDto) {
    const question = String(body?.question ?? "").trim();
    if (!question) {
      throw new BadRequestException({ ok: false, error: "question is required" });
    }

    try {
      return await this.ragService.askWithTools(question);
    } catch (e: unknown) {
      const err = e as Error;
      throw new HttpException(
        { ok: false, error: err?.message ?? String(e) },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
