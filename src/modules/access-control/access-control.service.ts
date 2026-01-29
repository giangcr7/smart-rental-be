import { Injectable, BadRequestException } from '@nestjs/common';
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
        throw new BadRequestException('Không nhận diện được khuôn mặt trong ảnh đăng ký.');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: response.data.encoding },
      });

      return { 
        message: 'Đăng ký FaceID thành công', 
        faceDescriptor: updatedUser.faceDescriptor 
      };
    } catch (error) {
      throw new BadRequestException('Lỗi trích xuất AI: ' + error.message);
    }
  }

  // --- 2. NHẬN DIỆN MỞ CỔNG (ĐÃ CẬP NHẬT DEVICE_ID) ---
  async verifyFaceWithAI(file: Express.Multer.File, deviceId: string) {
    // Tìm thiết bị để xác định chi nhánh
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { branchId: true }
    });

    if (!device) throw new BadRequestException('Thiết bị không tồn tại.');

    // Chỉ lấy cư dân ACTIVE tại đúng chi nhánh này
    const authorizedUsers = await this.prisma.user.findMany({
      where: {
        faceDescriptor: { isEmpty: false },
        isActive: true, 
        deletedAt: null,
        contracts: {
          some: {
            status: 'ACTIVE',
            room: { branchId: device.branchId }
          }
        }
      },
      select: { id: true, fullName: true, faceDescriptor: true },
    });

    if (authorizedUsers.length === 0) {
      throw new BadRequestException('Không có cư dân hợp lệ tại cơ sở này.');
    }

    const formData = new FormData();
    formData.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    formData.append(
      'known_encodings',
      JSON.stringify(authorizedUsers.map((u) => ({ id: u.id, encoding: u.faceDescriptor })))
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/verify', formData, {
          headers: { ...formData.getHeaders() },
        }),
      );

      if (response.data.status === 'success') {
        const userId = response.data.userId;
        const matchedUser = authorizedUsers.find(u => u.id === userId);

        await this.prisma.accessLog.create({
          data: {
            userId: userId,
            deviceId: deviceId,
            method: 'FACE_ID',
            status: 'SUCCESS',
            note: `Hợp lệ tại chi nhánh: ${device.branchId}`,
          },
        });

        return { status: 'success', fullName: matchedUser?.fullName, userId };
      }

      return { status: 'fail', message: 'Khuôn mặt lạ hoặc sai cơ sở.' };
    } catch (error) {
      throw new BadRequestException('Server AI không phản hồi');
    }
  }

  // --- 3. LẤY NHẬT KÝ (ĐÃ CẬP NHẬT BRANCH_ID) ---
  async getRecentLogs(limit: number = 10, branchId?: number) {
    const logs = await this.prisma.accessLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: branchId ? { device: { branchId: branchId } } : {},
      include: { 
        user: { 
          include: { 
            contracts: { 
              where: { status: 'ACTIVE', deletedAt: null },
              include: { room: true } 
            } 
          } 
        },
        device: { include: { branch: true } }
      }
    });

    return logs.map(log => {
      const activeContract = log.user?.contracts?.[0];
      return {
        id: log.id,
        method: log.method,
        status: log.status,
        createdAt: dayjs(log.createdAt).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
        branchName: log.device?.branch?.name || 'N/A',
        user: {
          fullName: log.user?.fullName || 'Người lạ',
          roomNumber: activeContract?.room?.roomNumber || 'N/A'
        }
      };
    });
  }
}