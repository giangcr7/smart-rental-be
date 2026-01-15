// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Validation (Kiểm tra dữ liệu đầu vào)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));

  // 2. Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Smart Boarding House API')
    .setDescription('Tài liệu API cho hệ thống quản lý nhà trọ')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); 

  // 3. CORS (Quan trọng: Để Frontend gọi được API)
  app.enableCors(); 

  // 4. [QUAN TRỌNG] Cấu hình Port cho Render
  // - process.env.PORT: Lấy port do Render cấp (bắt buộc)
  // - '0.0.0.0': Lắng nghe mọi địa chỉ IP (bắt buộc để Render nhìn thấy app)
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();