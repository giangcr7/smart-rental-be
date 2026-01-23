import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller'; // Import controller vào đây

@Module({
  imports: [HttpModule],
  controllers: [AccessControlController], // <--- CỰC KỲ QUAN TRỌNG: Phải khai báo ở đây
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}