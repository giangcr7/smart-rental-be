// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Kết nối đến database khi module khởi tạo
    await this.$connect();
  }

  async onModuleDestroy() {
    // Ngắt kết nối khi ứng dụng tắt (quan trọng để tránh leak connection)
    await this.$disconnect();
  }
}