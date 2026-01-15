import { Injectable } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo mới
  create(createBranchDto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: createBranchDto,
    });
  }

  // 2. Lấy danh sách (CHỈ LẤY CÁI CHƯA BỊ XÓA)
  findAll() {
    return this.prisma.branch.findMany({
      where: { deletedAt: null }, // <--- Lọc những cái chưa xóa
      include: {
        rooms: true, // Lấy kèm danh sách phòng
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Tìm một cái (Check cả ID và deletedAt)
  findOne(id: number) {
    return this.prisma.branch.findFirst({
      where: { 
        id,
        deletedAt: null 
      },
      include: { rooms: true },
    });
  }

  // 4. Cập nhật
  update(id: number, updateBranchDto: UpdateBranchDto) {
    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  // 5. XÓA MỀM (Soft Delete)
  remove(id: number) {
    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() }, 
    });
  }
}
