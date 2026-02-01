import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  process.env.TZ = 'Asia/Ho_Chi_Minh';
  const app = await NestFactory.create(AppModule);

  // 👇 SỬA LẠI ĐOẠN NÀY
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true, // 👈 BẮT BUỘC PHẢI CÓ DÒNG NÀY
    transformOptions: { enableImplicitConversion: true }, // (Tùy chọn) Giúp ép kiểu mạnh hơn
  }));
  
  // Cấu hình Swagger (Giữ nguyên)
  const config = new DocumentBuilder()
    .setTitle('Smart Boarding House API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Cấu hình CORS (Cho phép Frontend localhost:3000 gọi sang)
  app.enableCors({
    origin: true, 
    credentials: true,
  });

  // Chạy Port 3001 (để tránh đụng Next.js 3000)
  await app.listen(3001); 
  
  console.log(`Application is running on: http://localhost:3001`);
}
bootstrap();