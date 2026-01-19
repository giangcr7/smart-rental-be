import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // Import Role

// Import bộ 3 bảo vệ
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
@ApiTags('Contract - Quản lý Hợp đồng')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) // <--- FIX 1: Kích hoạt RolesGuard
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // --- NHÓM ADMIN (Quyền sinh sát) ---

  @Post()
  @Roles(Role.ADMIN) // <--- FIX 2: Chỉ Admin mới được tạo HĐ
  @ApiOperation({ summary: 'Tạo hợp đồng thuê mới (Chỉ Admin)' })
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractService.create(createContractDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // <--- FIX 3: Chỉ Admin mới sửa (gia hạn, đổi tiền cọc)
  @ApiOperation({ summary: 'Sửa thông tin hợp đồng (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateContractDto: UpdateContractDto) {
    return this.contractService.update(id, updateContractDto);
  }

  @Patch(':id/terminate')
  @Roles(Role.ADMIN) // <--- FIX 4: Chỉ Admin mới được thanh lý
  @ApiOperation({ summary: 'Thanh lý hợp đồng & Trả phòng (Chỉ Admin)' })
  terminate(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.terminate(id);
  }

  // --- NHÓM XEM (Thông minh hơn) ---

  @Get()
  @ApiOperation({ summary: 'Xem danh sách (Admin thấy hết - Tenant chỉ thấy của mình)' })
  findAll(@Req() req) { // <--- FIX 5: Lấy thông tin người đang request
    // Truyền user xuống Service để lọc dữ liệu
    return this.contractService.findAll(req.user); 
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hợp đồng' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    // Truyền user xuống để check: Tenant A không được xem HĐ của Tenant B
    return this.contractService.findOne(id, req.user);
  }
}