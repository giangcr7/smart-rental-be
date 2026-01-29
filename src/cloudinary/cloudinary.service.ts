import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  /**
   * Cập nhật hàm upload để tự động nhận diện loại tệp
   */
  uploadFile(
    file: Express.Multer.File, 
    folderName: string = 'others'
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `smart-boarding-house/${folderName}`,
          // QUAN TRỌNG: Cho phép Cloudinary tự nhận diện Video, Ảnh, hoặc File khác
          resource_type: 'auto', 
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(error);
          }
          if (!result) return reject(new Error('Cloudinary upload failed'));
          resolve(result);
        },
      );

      // Chuyển buffer từ bộ nhớ RAM sang luồng upload
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}