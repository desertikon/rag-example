import {
  Body,
  Controller,
  Post,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
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
}
