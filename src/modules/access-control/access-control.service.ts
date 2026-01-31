import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import dayjs from 'dayjs'; 
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  // --- 1. ĐĂNG KÝ KHUÔN MẶT ---
  async registerFace(userId: number, file: Express.Multer.File) {
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/extract-features', formData, {
          headers: { ...formData.getHeaders() },
        }),
      );

      if (response.data.status === 'fail') {
        throw new BadRequestException('AI không thể trích xuất đặc trưng. Hãy chụp rõ mặt hơn.');
      }

      // Lưu mảng 128 số trực tiếp vào User
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: response.data.encoding },
      });

      return { 
        message: 'Định danh FaceID thành công', 
        fullName: updatedUser.fullName 
      };
    } catch (error) {
      this.logger.error(`Lỗi Register: ${error.message}`);
      throw new BadRequestException('Hệ thống AI đang bận hoặc lỗi ảnh: ' + error.message);
    }
  }

  // --- 2. NHẬN DIỆN MỞ CỔNG (LUỒNG CHUẨN THUÊ TRỌ) ---
  async verifyFaceWithAI(file: Express.Multer.File, deviceId: string) {
    // 1. Xác định vị trí cổng (Device) thuộc chi nhánh nào
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { branch: true }
    });

    if (!device) throw new BadRequestException('Thiết bị (Gate ID) không hợp lệ trên hệ thống.');

    // 2. LẤY DANH SÁCH ĐỐI SOÁT: Nới lỏng để cư dân mới chưa có hợp đồng vẫn được nhận diện nếu thuộc chi nhánh
// src/modules/access-control/access-control.service.ts

const authorizedUsers = await this.prisma.user.findMany({
  where: {
    isActive: true, 
    deletedAt: null,
    branchId: device.branchId,
    // SỬA TẠI ĐÂY: Loại bỏ những người có mảng faceDescriptor rỗng
    NOT: {
      faceDescriptor: {
        equals: [], // Kiểm tra mảng có bằng mảng rỗng hay không
      },
    },
  },
  select: { id: true, fullName: true, faceDescriptor: true },
});

    if (authorizedUsers.length === 0) {
      throw new BadRequestException('Chi nhánh này hiện chưa có cư dân nào được cấp quyền FaceID.');
    }

    // 3. GỬI DỮ LIỆU SANG PYTHON AI
    const formData = new FormData();
    formData.append('file', file.buffer, { filename: 'verify.jpg', contentType: file.mimetype });
    formData.append(
      'known_encodings',
      JSON.stringify(authorizedUsers.map((u) => ({ id: u.id, encoding: u.faceDescriptor })))
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/verify', formData, {
          headers: { ...formData.getHeaders() },
          timeout: 5000 // Timeout 5s để đảm bảo phản hồi nhanh tại cổng
        }),
      );

      if (response.data.status === 'success') {
        const userId = response.data.userId;
        const matchedUser = authorizedUsers.find(u => u.id === userId);

        // Ghi nhật ký thành công
        await this.prisma.accessLog.create({
          data: {
            userId: userId,
            deviceId: deviceId,
            method: 'FACE_ID',
            status: 'SUCCESS',
            note: `Xác thực tại: ${device.branch.name}`,
          },
        });

        return { 
          status: 'success', 
          fullName: matchedUser?.fullName, 
          userId,
          message: `Chào mừng ${matchedUser?.fullName} về nhà!` 
        };
      }

      // Trường hợp không khớp: Ghi log thất bại để Admin theo dõi
      return { status: 'fail', message: 'Cảnh báo! Khuôn mặt không có trong danh sách cư dân chi nhánh này.' };

    } catch (error) {
      this.logger.error(`AI Verify Error: ${error.message}`);
      throw new BadRequestException('Hệ thống nhận diện đang gặp sự cố kết nối.');
    }
  }

  // --- 3. NHẬT KÝ (FORMAT VIỆT NAM) ---
  async getRecentLogs(limit: number = 10, branchId?: number) {
    const logs = await this.prisma.accessLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: branchId ? { device: { branchId: branchId } } : {},
      include: { 
        user: true,
        device: { include: { branch: true } }
      }
    });

    return logs.map(log => ({
      id: log.id,
      method: log.method,
      status: log.status,
      time: dayjs(log.createdAt).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY'),
      branch: log.device?.branch?.name || 'Cổng lạ',
      resident: log.user?.fullName || 'Người lạ',
    }));
  }
}