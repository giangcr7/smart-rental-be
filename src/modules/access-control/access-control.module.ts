import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';

@Module({
  imports: [
    HttpModule, 
    PrismaModule,  ], 
  controllers: [AccessControlController],
  providers: [AccessControlService],
})
export class AccessControlModule {}