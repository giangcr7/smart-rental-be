import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // 1. Import Role từ Prisma

// 2. Import 2 file bảo vệ bạn vừa tạo
import { RolesGuard } from '../../auth/guard/roles.guard';       // Folder là 'guard'
import { Roles } from '../../auth/decorator/roles.decorator';
@ApiTags('Room - Quản lý Phòng')
@ApiBearerAuth()
// 3. Kích hoạt cả 2 lớp bảo vệ: Login (AuthGuard) VÀ Phân quyền (RolesGuard)
@UseGuards(AuthGuard('jwt'), RolesGuard) 
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // --- CÁC API CHỈ ADMIN MỚI DÙNG ĐƯỢC ---

  @Post()
  @Roles(Role.ADMIN) // <--- Chỉ Admin mới được Thêm phòng
  @ApiOperation({ summary: 'Thêm phòng mới (Chỉ Admin)' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // <--- Chỉ Admin mới được Sửa phòng
  @ApiOperation({ summary: 'Sửa thông tin phòng (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // <--- Chỉ Admin mới được Xóa phòng
  @ApiOperation({ summary: 'Xóa phòng (Chỉ Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.remove(id);
  }

  // --- CÁC API CÔNG KHAI (AI ĐĂNG NHẬP CŨNG XEM ĐƯỢC) ---
  
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả phòng' })
  // Không gắn @Roles -> Nghĩa là Admin hay Tenant đều xem được
  findAll() {
    return this.roomService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.findOne(id);
  }
}