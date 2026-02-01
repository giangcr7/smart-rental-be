import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { PrismaModule } from 'src/prisma/prisma.module'; // 👈 1. Import file này

@Module({
  imports: [PrismaModule], // 👈 2. Đăng ký vào đây
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}