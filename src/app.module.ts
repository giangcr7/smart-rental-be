import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { BranchModule } from './modules/branch/branch.module';
import { RoomModule } from './modules/room/room.module';
import { ContractModule } from './modules/contract/contract.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module'; 
import { UsersModule } from './modules/users/users.module';
@Module({

imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
