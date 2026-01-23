import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer'; //
import { ScheduleModule } from '@nestjs/schedule'; //
import { BranchModule } from './modules/branch/branch.module';
import { RoomModule } from './modules/room/room.module';
import { ContractModule } from './modules/contract/contract.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module'; 
import { UsersModule } from './modules/users/users.module';
import { AccessControlModule } from './modules/access-control/access-control.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 1. Cấu hình Schedule để chạy các tác vụ tự động (Nhắc hẹn)
    ScheduleModule.forRoot(),

    // 2. Cấu hình Mailer để gửi Email thông báo hóa đơn
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        auth: {
          user: process.env.MAIL_USER, // Email của Giang (nên để trong .env)
          pass: process.env.MAIL_PASS, // Mật khẩu ứng dụng 16 ký tự
        },
      },
      defaults: {
        from: '"Hệ thống Quản lý Phòng trọ" <no-reply@gmail.com>',
      },
    }),

    PrismaModule,
    AuthModule,
    BranchModule,
    RoomModule,
    ContractModule,
    InvoiceModule,
    StatisticsModule,
    CloudinaryModule,
    UsersModule,
    AccessControlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}