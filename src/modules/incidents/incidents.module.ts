import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
// 👇 1. Import CloudinaryModule
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module'; 

@Module({
  imports: [
    CloudinaryModule // 👇 2. Thêm vào đây
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}