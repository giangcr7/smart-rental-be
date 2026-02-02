import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentStatus, Role } from '@prisma/client';
// 👇 1. Import CloudinaryService (Đảm bảo bạn đã có module này)
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService // 👇 2. Inject Cloudinary vào đây
  ) {}

  // 1. TẠO BÁO CÁO (Nâng cấp để nhận file)
  async create(userId: number, createIncidentDto: CreateIncidentDto, files?: Array<Express.Multer.File>) {
    
    // 👇 3. Logic upload ảnh/video
    let mediaUrls: string[] = createIncidentDto.images || []; // Lấy link cũ nếu có

    if (files && files.length > 0) {
      try {
        // Upload song song tất cả file để nhanh hơn
        const uploadPromises = files.map(file => 
          this.cloudinary.uploadFile(file).then(res => res.secure_url)
        );
        const uploadedUrls = await Promise.all(uploadPromises);
        
        // Gộp link vừa upload vào danh sách
        mediaUrls = [...mediaUrls, ...uploadedUrls];
      } catch (error) {
        console.error("Upload error:", error);
        throw new BadRequestException('Lỗi khi upload ảnh/video minh chứng.');
      }
    }

    // Tìm hợp đồng đang ACTIVE
    const activeContract = await this.prisma.contract.findFirst({
      where: { 
        userId: userId, 
        status: 'ACTIVE',
        deletedAt: null 
      },
    });

    return this.prisma.incident.create({
      data: {
        title: createIncidentDto.title, // Map thủ công để đảm bảo an toàn
        description: createIncidentDto.description,
        priority: createIncidentDto.priority,
        
        // 👇 4. Lưu mảng URL ảnh/video vào Database
        images: mediaUrls, 
        
        userId: userId,
        roomId: activeContract?.roomId || null,
        status: IncidentStatus.PENDING,
      },
    });
  }

  // 2. LẤY DANH SÁCH (Giữ nguyên)
  async findAll(user: any, status?: IncidentStatus) {
    const where: any = { deletedAt: null };

    if (status) where.status = status;

    if (user.role === Role.TENANT) {
      where.userId = user.id;
    }

    return this.prisma.incident.findMany({
      where,
      include: {
        room: { select: { roomNumber: true, branch: { select: { name: true } } } },
        user: { select: { fullName: true, phone: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. CHI TIẾT (Giữ nguyên)
  async findOne(id: number) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        room: true,
        user: true
      }
    });
    if (!incident) throw new NotFoundException('Không tìm thấy báo cáo này');
    return incident;
  }

  // 4. CẬP NHẬT (Giữ nguyên)
  async update(id: number, updateIncidentDto: UpdateIncidentDto) {
    return this.prisma.incident.update({
      where: { id },
      data: updateIncidentDto,
    });
  }

  // 5. XÓA (Giữ nguyên)
  async remove(id: number) {
    return this.prisma.incident.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}