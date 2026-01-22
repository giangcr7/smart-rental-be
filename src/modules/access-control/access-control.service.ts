import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');

@Injectable()
export class AccessControlService {
  constructor(
    private readonly httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  // --- HÀM 1: ĐĂNG KÝ KHUÔN MẶT ---
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
        throw new BadRequestException('Không tìm thấy khuôn mặt trong ảnh');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: response.data.encoding },
      });

      return { message: 'Đăng ký khuôn mặt thành công' };
    } catch (error) {
      throw new BadRequestException('Lỗi trích xuất: ' + error.message);
    }
  }

  // --- HÀM 2: NHẬN DIỆN MỞ CỔNG ---
  async verifyFaceWithAI(file: Express.Multer.File) {
    // 1. Lấy tất cả User ĐÃ CÓ khuôn mặt (Sửa lỗi Prisma query mảng ở đây)
    const usersWithFace = await this.prisma.user.findMany({
      where: {
        NOT: {
          faceDescriptor: {
            equals: [], // Loại bỏ mảng rỗng
          },
        },
        deletedAt: null,
      },
      select: { id: true, faceDescriptor: true },
    });

    if (usersWithFace.length === 0) {
      throw new BadRequestException('Hệ thống chưa có dữ liệu khuôn mặt mẫu nào.');
    }

    // 2. Chuẩn bị FormData gửi sang Python
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // --- QUAN TRỌNG: Gửi kèm danh sách vector để AI so sánh ---
    formData.append(
      'known_encodings',
      JSON.stringify(
        usersWithFace.map((u) => ({
          id: u.id,
          encoding: u.faceDescriptor,
        })),
      ),
    );

    try {
      // 3. Gọi Python AI verify
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/verify', formData, {
          headers: { ...formData.getHeaders() },
        }),
      );

      if (response.data.status === 'success') {
        const userId = response.data.userId;

        // 4. Lưu log vào DB
        await this.prisma.accessLog.create({
          data: {
            userId: userId,
            method: 'FACE_ID',
            status: 'SUCCESS',
            note: `Khớp với User ID: ${userId}`,
          },
        });

        return { success: true, message: 'Mở cổng thành công!', userId };
      }

      return { success: false, message: 'Khuôn mặt không hợp lệ' };
    } catch (error) {
      console.error('Lỗi AI Service:', error.message);
      throw new BadRequestException('Máy chủ nhận diện không phản hồi');
    }
  }
}