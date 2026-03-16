import { Module } from "@nestjs/common";
import { RagModule } from "./rag/rag.module";
import { TtsModule } from "./tts/tts.module";

@Module({
  imports: [RagModule, TtsModule],
})
export class AppModule {}
