import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, ContractStatus, Role } from '@prisma/client';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  async create(createContractDto: CreateContractDto) {
    const { roomId, userId, startDate, endDate, deposit, scanImage } = createContractDto;

    const room = await this.prisma.room.findFirst({ 
      where: { id: roomId, deletedAt: null } 
    });
    if (!room) throw new NotFoundException('Phòng không tồn tại');
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException('Phòng đã có người thuê!');
    }

    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, deletedAt: null } 
    });
    if (!user) throw new NotFoundException('Người thuê không tồn tại');

    return this.prisma.$transaction(async (prisma) => {
      const newContract = await prisma.contract.create({
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          deposit: deposit,
          status: ContractStatus.ACTIVE,
          userId: userId,
          roomId: roomId,
          scanImage: scanImage,
        },
      });

      await prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.OCCUPIED },
      });

      return newContract;
    });
  }

  async findAll(user: any, branchId?: number) {
    const whereCondition: any = { deletedAt: null };

    if (user.role !== Role.ADMIN) {
      whereCondition.userId = user.id;
    } else if (branchId) {
      whereCondition.room = { branchId: Number(branchId) };
    }

    return this.prisma.contract.findMany({
      where: whereCondition,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { include: { branch: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, user: any) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      include: { user: true, room: { include: { branch: true } } },
    });

    if (!contract) throw new NotFoundException(`Hợp đồng #${id} không tồn tại`);

    if (user.role !== Role.ADMIN && contract.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem bản ghi này!');
    }

    return contract;
  }

  async update(id: number, updateContractDto: UpdateContractDto) {
    const existing = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) throw new NotFoundException('Không tìm thấy hợp đồng');

    return this.prisma.contract.update({
      where: { id },
      data: updateContractDto,
    });
  }

  async terminate(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const existingContract = await prisma.contract.findFirst({ where: { id, deletedAt: null } });
      if (!existingContract) throw new NotFoundException('Hợp đồng không tồn tại');

      const contract = await prisma.contract.update({
        where: { id },
        data: { status: ContractStatus.TERMINATED },
      });

      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }

  async remove(id: number) {
    const existingContract = await this.prisma.contract.findFirst({ where: { id, deletedAt: null } });
    if (!existingContract) throw new NotFoundException('Hợp đồng không tồn tại');

    return this.prisma.$transaction(async (prisma) => {
      const contract = await prisma.contract.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }

  async findDeleted(branchId?: number) {
    return this.prisma.contract.findMany({
      where: { 
        deletedAt: { not: null },
        ...(branchId ? { room: { branchId: Number(branchId) } } : {})
      },
      include: {
        user: { select: { fullName: true } },
        room: { select: { roomNumber: true, branch: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async restore(id: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: { not: null } }
    });
    if (!contract) throw new NotFoundException('Không tìm thấy trong thùng rác');

    return this.prisma.$transaction(async (prisma) => {
      const restoredContract = await prisma.contract.update({
        where: { id },
        data: { deletedAt: null },
      });

      if (restoredContract.status === ContractStatus.ACTIVE) {
        await prisma.room.update({
          where: { id: restoredContract.roomId },
          data: { status: RoomStatus.OCCUPIED },
        });
      }

      return restoredContract;
    });
  }

  async hardDelete(id: number) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');

    return this.prisma.contract.delete({ where: { id } });
  }
}