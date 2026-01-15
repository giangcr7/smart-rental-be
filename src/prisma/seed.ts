import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Tạo Khu trọ
  const branch1 = await prisma.branch.create({
    data: {
      name: 'Nhà trọ Hạnh Phúc - CS1',
      address: '123 Cầu Giấy, Hà Nội',
      manager: 'Giang Manager',
      image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    },
  });

  // 2. Tạo Phòng (5 phòng)
  for (let i = 1; i <= 5; i++) {
    await prisma.room.create({
      data: {
        roomNumber: `P10${i}`,
        price: 3500000 + (i * 100000), // Giá tăng dần
        area: 25,
        branchId: branch1.id,
        image: 'https://res.cloudinary.com/demo/image/upload/sample_room.jpg'
      }
    });
  }

  // 3. Tạo User Admin & Tenant
  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      password: '123', // Lưu ý: Thực tế phải hash password, đây là demo
      fullName: 'Admin Giang',
      role: 'ADMIN',
      avatar: 'https://res.cloudinary.com/demo/image/upload/avatar_admin.jpg'
    }
  });

  console.log('✅ Đã tạo dữ liệu mẫu thành công!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());