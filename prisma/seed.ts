// prisma/seed.ts
// 1. Thêm import "User" ở đây để định nghĩa kiểu dữ liệu
import { PrismaClient, Role, RoomStatus, ContractStatus, InvoiceStatus, User } from '@prisma/client';

const prisma = new PrismaClient();

// Dữ liệu mẫu
const BRANCHES = [
  { name: 'Happy House Cầu Giấy', address: 'Số 12, Ngõ 34 Cầu Giấy, Hà Nội', img: 'https://res.cloudinary.com/demo/image/upload/v1/sample/architecture' },
  { name: 'Dream Home Đống Đa', address: '102 Chùa Láng, Đống Đa, Hà Nội', img: 'https://res.cloudinary.com/demo/image/upload/v1/sample/landscapes/architecture-signs' },
  { name: 'Sunshine House Thanh Xuân', address: '45 Nguyễn Trãi, Thanh Xuân, Hà Nội', img: 'https://res.cloudinary.com/demo/image/upload/v1/sample/landscapes/beach-boat' },
];

const FIRST_NAMES = ['An', 'Bình', 'Cường', 'Dũng', 'Giang', 'Hùng', 'Hương', 'Khánh', 'Lan', 'Minh', 'Nam', 'Nga', 'Phong', 'Quân', 'Thảo', 'Tuấn', 'Uyên', 'Vân', 'Yến'];
const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const ROOM_IMAGES = [
  'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/sample/indoor.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/sample/people/kitchen-bar.jpg'
];

const randomElement = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🌱 Bắt đầu Seeding theo Schema chuẩn...');

  // 1. Dọn dẹp dữ liệu cũ
  try {
    await prisma.invoice.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.room.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.user.deleteMany(); 
  } catch (e) {
    console.log('⚠️ Database mới, bỏ qua bước dọn dẹp.');
  }

  // 2. Tạo Admin
  console.log('👤 Đang tạo Admin...');
  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      password: '123',
      fullName: 'Super Admin Giang',
      phone: '0988123456',
      role: Role.ADMIN,
      avatar: 'https://res.cloudinary.com/demo/image/upload/v1/sample/people/smiling-man.jpg',
      faceDescriptor: [],
    },
  });

  // 3. Tạo 50 Tenants
  console.log('👥 Đang tạo 50 khách thuê...');
  // SỬA LỖI Ở ĐÂY: Khai báo rõ ràng đây là mảng chứa User
  const tenants: User[] = []; 
  
  for (let i = 1; i <= 50; i++) {
    const ho = randomElement(LAST_NAMES);
    const ten = randomElement(FIRST_NAMES);
    const user = await prisma.user.create({
      data: {
        email: `tenant${i}@gmail.com`,
        password: '123',
        fullName: `${ho} ${ten}`,
        phone: `09${randomInt(10000000, 99999999)}`,
        role: Role.TENANT,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        faceDescriptor: [],
      },
    });
    tenants.push(user);
  }

  // 4. Tạo Branch & Room
  console.log('uta Đang tạo Chi nhánh & Phòng...');
  for (const branchData of BRANCHES) {
    const branch = await prisma.branch.create({
      data: {
        name: branchData.name,
        address: branchData.address,
        image: branchData.img,
        manager: "Lê Hoàng Giang",
      },
    });

    const numRooms = randomInt(10, 15);
    for (let j = 1; j <= numRooms; j++) {
      const floor = Math.floor((j - 1) / 5) + 1;
      const roomNum = j % 5 === 0 ? 5 : j % 5;
      const roomNumber = `P${floor}0${roomNum}`;
      const price = randomInt(30, 50) * 100000;
      const area = randomInt(20, 35);

      const room = await prisma.room.create({
        data: {
          roomNumber: roomNumber,
          price: price,
          area: area,
          status: RoomStatus.AVAILABLE,
          image: randomElement(ROOM_IMAGES),
          branchId: branch.id,
        },
      });

      // 5. Tạo Hợp đồng & Hóa đơn (Lấp đầy 60%)
      if (Math.random() > 0.4) {
        const tenant = randomElement(tenants);
        
        // Tạo hợp đồng
        await prisma.contract.create({
          data: {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2026-01-01'),
            deposit: price,
            status: ContractStatus.ACTIVE,
            userId: tenant.id, // Bây giờ tenant đã có kiểu User nên tenant.id không bị lỗi nữa
            roomId: room.id,
            scanImage: "https://res.cloudinary.com/demo/image/upload/v1/sample/documents/contract.jpg"
          }
        });

        // Cập nhật trạng thái phòng
        await prisma.room.update({
          where: { id: room.id },
          data: { status: RoomStatus.OCCUPIED }
        });

        // Tạo hóa đơn
        await prisma.invoice.create({
          data: {
            month: 1,
            year: 2025,
            oldElectricity: 100,
            newElectricity: 150,
            oldWater: 20,
            newWater: 25,
            serviceFee: 150000,
            totalAmount: price + 150000 + (50 * 3500) + (5 * 20000),
            status: Math.random() > 0.5 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID,
            room: {
                connect: { id: room.id }
            }
          }
        });
      }
    }
  }

  console.log('✅ SEEDING THÀNH CÔNG 100%!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });