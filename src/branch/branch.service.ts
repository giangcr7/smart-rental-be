import { Injectable, NotFoundException } from '@nestjs/common'; // Thêm NotFoundException
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
      where: { deletedAt: null },
      include: {
        rooms: true, // Lấy kèm danh sách phòng để Frontend hiển thị số lượng
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Tìm một cái (Có báo lỗi nếu không tìm thấy)
  async findOne(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { 
        id,
        deletedAt: null 
      },
      include: { rooms: true },
    });

    // Thêm đoạn này để API trả về 404 thay vì null
    if (!branch) {
      throw new NotFoundException(`Khu trọ với ID ${id} không tồn tại hoặc đã bị xóa`);
    }

    return branch;
  }

  // 4. Cập nhật
  async update(id: number, updateBranchDto: UpdateBranchDto) {
    // Gọi hàm findOne ở trên để kiểm tra tồn tại trước
    await this.findOne(id); 

    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  // 5. XÓA MỀM (Soft Delete)
  async remove(id: number) {
    // Gọi hàm findOne để kiểm tra tồn tại trước
    await this.findOne(id);

    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() }, 
    });
  }
}