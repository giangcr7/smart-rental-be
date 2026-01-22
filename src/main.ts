
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  
  // Cấu hình Swagger (Giữ nguyên)
  const config = new DocumentBuilder()
    .setTitle('Smart Boarding House API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors(); // Giữ nguyên để Frontend gọi được

  // --- SỬA ĐOẠN NÀY ---
  
  // 1. Cấu hình cho Render (Tạm thời Comment lại)
  // const port = process.env.PORT || 3000;
  // await app.listen(port, '0.0.0.0');

  // 2. Cấu hình cho Local (Bật cái này lên)
  // Chỉ lắng nghe cổng 3000 trên máy mình thôi
  await app.listen(3001); 
  
  console.log(`Application is running on: http://localhost:3001`);
}
bootstrap();