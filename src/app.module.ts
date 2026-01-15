import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { BranchModule } from './branch/branch.module';
import { RoomModule } from './room/room.module';
import { ContractModule } from './contract/contract.module';
import { InvoiceModule } from './invoice/invoice.module';
import { StatisticsModule } from './statistics/statistics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module'; 
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
