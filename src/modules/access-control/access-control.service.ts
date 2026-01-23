import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

      // Cập nhật và lấy lại thông tin user để trả về Frontend
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: response.data.encoding },
      });

      // TRẢ VỀ CẢ DATA ĐỂ FRONTEND CẬP NHẬT ICON TẤM KHIÊN
      return { 
        message: 'Đăng ký khuôn mặt thành công', 
        faceDescriptor: updatedUser.faceDescriptor 
      };
    } catch (error) {
      throw new BadRequestException('Lỗi trích xuất: ' + error.message);
    }
  }

  // --- HÀM 2: NHẬN DIỆN MỞ CỔNG ---
  async verifyFaceWithAI(file: Express.Multer.File) {
    // 1. Lấy tất cả cư dân có dữ liệu mặt (Dùng NOT equals [] để lọc chính xác trong Postgres)
    const usersWithFace = await this.prisma.user.findMany({
      where: {
        faceDescriptor: {
          isEmpty: false // Prisma hỗ trợ kiểm tra mảng rỗng cho PostgreSQL
        },
        deletedAt: null,
      },
      select: { id: true, fullName: true, faceDescriptor: true },
    });

    if (usersWithFace.length === 0) {
      throw new BadRequestException('Hệ thống chưa có dữ liệu khuôn mặt mẫu nào.');
    }

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

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
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/verify', formData, {
          headers: { ...formData.getHeaders() },
        }),
      );

      if (response.data.status === 'success') {
        const userId = response.data.userId;
        const matchedUser = usersWithFace.find(u => u.id === userId);

        // Ghi nhật ký ra vào chuẩn xác vào bảng AccessLog
        await this.prisma.accessLog.create({
          data: {
            userId: userId,
            method: 'FACE_ID',
            status: 'SUCCESS',
            note: `Khớp với cư dân: ${matchedUser?.fullName}`,
          },
        });

        return { 
          status: 'success', // Đổi thành success để khớp với FaceVerifyModal.tsx
          fullName: matchedUser?.fullName,
          userId 
        };
      }

      return { status: 'fail', message: 'Khuôn mặt không khớp với cư dân nào' };
    } catch (error) {
      console.error('Lỗi AI Service:', error.message);
      throw new BadRequestException('Máy chủ nhận diện không phản hồi');
    }
  }
}