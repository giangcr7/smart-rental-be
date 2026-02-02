import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentStatus } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express'; // 👇 Import Interceptor xử lý file

// import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; 

@Controller('incidents')
// @UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  // API: Tạo báo cáo (Kèm upload file)
  @Post()
  @UseInterceptors(FilesInterceptor('files')) // 👇 'files' là tên key bên Frontend gửi lên
  create(
    @Req() req: any, 
    @Body() createIncidentDto: CreateIncidentDto,
    @UploadedFiles() files: Array<Express.Multer.File> // 👇 Nhận file vào biến này
  ) {
    // Truyền cả userId, DTO và Files sang Service
    return this.incidentsService.create(req.user.id, createIncidentDto, files);
  }

  // API: Lấy danh sách
  @Get()
  findAll(@Req() req: any, @Query('status') status?: IncidentStatus) {
    return this.incidentsService.findAll(req.user, status);
  }

  // API: Xem chi tiết
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(+id);
  }

  // API: Cập nhật
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIncidentDto: UpdateIncidentDto) {
    return this.incidentsService.update(+id, updateIncidentDto);
  }

  // API: Xóa
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.incidentsService.remove(+id);
  }
}