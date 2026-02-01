import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';
// ❌ Đã xóa import EventsGateway
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
    // ❌ Đã xóa inject EventsGateway
  ) {}

  // =================================================================
  // 1. ĐĂNG KÝ KHUÔN MẶT (Giữ nguyên logic lưu DB)
  // =================================================================
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
        throw new BadRequestException('AI không thể trích xuất đặc trưng.');
      }

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
      throw new BadRequestException('Lỗi kết nối AI Service: ' + error.message);
    }
  }

  // =================================================================
  // 2. NHẬN DIỆN & LƯU LOG VÀO DATABASE
  // =================================================================
  async verifyFaceWithAI(file: Express.Multer.File, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { branch: true }
    });
    if (!device) throw new BadRequestException('Gate ID không hợp lệ.');

    const authorizedUsers = await this.prisma.user.findMany({
      where: {
        isActive: true, 
        deletedAt: null,
        branchId: device.branchId,
        NOT: { faceDescriptor: { equals: [] } },
      },
      select: { id: true, fullName: true, faceDescriptor: true },
    });

    if (authorizedUsers.length === 0) {
      throw new BadRequestException('Chi nhánh chưa có cư dân FaceID.');
    }

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
          timeout: 5000 
        }),
      );

      if (response.data.status === 'success') {
        const userId = response.data.userId;
        const matchedUser = authorizedUsers.find(u => u.id === userId);

        if (!matchedUser) {
           throw new BadRequestException('Lỗi dữ liệu: AI trả về ID không khớp.');
        }

        // ✅ CHỈ LƯU LOG VÀO DB (Không bắn Socket nữa)
        await this.prisma.accessLog.create({
          data: {
            userId: userId,
            deviceId: deviceId,
            method: 'FACE_ID',
            status: 'SUCCESS',
            note: `Verified at: ${device.branch.name}`,
          },
        });

        this.logger.log(`✅ Cư dân ${matchedUser.fullName} đã vào cổng.`);

        return { 
          status: 'success', 
          fullName: matchedUser.fullName, 
          userId,
          message: `Xin chào ${matchedUser.fullName}!` 
        };
      }

      return { status: 'fail', message: 'Khuôn mặt không tồn tại.' };

    } catch (error) {
      this.logger.error(`AI Verify Error: ${error.message}`);
      throw new BadRequestException('AI Service không phản hồi.');
    }
  }

  // =================================================================
  // 3. LẤY LOGS CHO TRANG DASHBOARD/LỊCH SỬ
  // =================================================================
  async getRecentLogs(limit: number = 10, branchId?: number) {
    const logs = await this.prisma.accessLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: branchId ? { device: { branchId: Number(branchId) } } : {},
      include: { 
        user: true,
        device: { include: { branch: true } }
      }
    });

    return Promise.all(logs.map(async (log) => {
      const contract = log.userId ? await this.prisma.contract.findFirst({
        where: { userId: log.userId, status: 'ACTIVE' },
        include: { room: true }
      }) : null;

      return {
        id: log.id,
        method: log.method,
        status: log.status,
        createdAt: log.createdAt,
        time: dayjs(log.createdAt).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY'),
        branch: log.device?.branch?.name || 'Unknown',
        resident: log.user?.fullName || 'Unknown',
        user: log.user,
        room: contract?.room || null
      };
    }));
  }
}