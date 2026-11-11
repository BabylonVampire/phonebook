import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  // собранный клиент (client/dist) раздаётся тем же сервером
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  if (existsSync(clientDist)) app.useStaticAssets(clientDist);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Телефонный справочник: http://localhost:${port}`);
}
bootstrap();
