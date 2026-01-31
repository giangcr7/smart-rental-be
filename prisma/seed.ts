import { PrismaClient, Role, RoomStatus, ContractStatus, InvoiceStatus, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BRANCHES = [
  { 
    id: 1, 
    name: 'SmartHouse Cầu Giấy', 
    address: 'Số 12, Ngõ 34 Cầu Giấy, Hà Nội', 
    img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=2070&auto=format&fit=crop' 
  },
  { 
    id: 2,
    name: 'SmartHouse Đống Đa', 
    address: '102 Chùa Láng, Đống Đa, Hà Nội', 
    img: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=2109&auto=format&fit=crop' 
  },
];

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=2071&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2070&auto=format&fit=crop'
];

async function main() {
  console.log('🌱 Đang dọn dẹp và khởi tạo dữ liệu SmartHouse AI...');

  const saltRounds = 10;
  const hashPassword = await bcrypt.hash('123456', saltRounds);

  // 1. Dọn dẹp dữ liệu cũ (Xóa theo thứ tự để tránh lỗi ràng buộc khóa ngoại)
  await prisma.$transaction([
    prisma.accessLog.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.device.deleteMany(),
    prisma.room.deleteMany(),
    prisma.user.deleteMany(),
    prisma.branch.deleteMany(),
  ]);

  // 2. Tạo Admin tổng quản lý hệ thống
  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      password: hashPassword,
      fullName: 'Lê Hoàng Giang',
      role: Role.ADMIN,
      isActive: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giang',
    },
  });

  // 3. Tạo 20 Cư dân mẫu
  const tenants: User[] = []; 
  
  for (let i = 1; i <= 20; i++) {
    const tenant = await prisma.user.create({
      data: {
        email: `tenant${i}@gmail.com`,
        password: hashPassword,
        fullName: `Cư dân số ${i}`,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: Role.TENANT,
        isActive: true,
        faceDescriptor: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
      },
    });
    tenants.push(tenant);
  }

  // 4. Khởi tạo Chi nhánh, Thiết bị, Phòng và Hợp đồng
  let tenantIndex = 0;
  for (const b of BRANCHES) {
    const branch = await prisma.branch.create({
      data: {
        id: b.id,
        name: b.name,
        address: b.address,
        image: b.img,
        manager: "Lê Hoàng Giang",
      },
    });

    const device = await prisma.device.create({
      data: {
        id: b.id === 1 ? 'WEB_CAM_GIANG' : `CAM_CS_${branch.id}`,
        name: `Gate AI Scanner - ${branch.name}`,
        type: 'CAMERA',
        branchId: branch.id
      }
    });

    for (let j = 1; j <= 10; j++) {
      const isOccupied = j <= 7; // Mỗi chi nhánh cho thuê 7 phòng, trống 3 phòng
      const price = 3000000 + (j * 200000);

      const room = await prisma.room.create({
        data: {
          roomNumber: `${b.id}${j.toString().padStart(2, '0')}`,
          price,
          area: 25,
          status: isOccupied ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE,
          branchId: branch.id,
          image: ROOM_IMAGES[j % 2],
          utilities: ["Wifi", "Điều hòa", "Nóng lạnh", "Máy giặt"],
        },
      });

      if (isOccupied && tenantIndex < tenants.length) {
        const tenant = tenants[tenantIndex];
        
        // Gán cư dân vào chi nhánh tương ứng để kích hoạt AI FaceID
        await prisma.user.update({
          where: { id: tenant.id },
          data: { branchId: branch.id }
        });

        // TẠO HỢP ĐỒNG: Đã bổ sung branchId để fix lỗi Type
        await prisma.contract.create({
          data: {
            userId: tenant.id,
            roomId: room.id,
            branchId: branch.id, // <--- ĐÃ FIX: Khớp với Schema bắt buộc branchId
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            deposit: price,
            status: ContractStatus.ACTIVE,
          }
        });

        // Tạo hóa đơn mẫu cho tháng hiện tại
        await prisma.invoice.create({
          data: {
            userId: tenant.id,
            roomId: room.id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            oldElectricity: 100,
            newElectricity: 145,
            oldWater: 10,
            newWater: 14,
            serviceFee: 50000,
            totalAmount: price + 150000,
            status: InvoiceStatus.UNPAID,
          }
        });

        // Tạo lịch sử ra vào mẫu cho cư dân
        await prisma.accessLog.create({
          data: {
            userId: tenant.id,
            deviceId: device.id,
            status: "SUCCESS",
            method: "FACE_ID",
            note: "AI xác thực: Khớp hồ sơ cư dân"
          }
        });

        tenantIndex++;
      }
    }
  }

  console.log(`🚀 SEEDING THÀNH CÔNG: Hệ thống SmartHouse đã sẵn sàng với ${tenants.length} cư dân!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });