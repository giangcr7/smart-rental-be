// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // <--- 1. Import

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));

  // --- 2. Cấu hình Swagger ---
  const config = new DocumentBuilder()
    .setTitle('Smart Boarding House API')
    .setDescription('Tài liệu API cho hệ thống quản lý nhà trọ')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); 
  app.enableCors(); 

  await app.listen(3000);
}
bootstrap();