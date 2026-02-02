import { PartialType } from '@nestjs/mapped-types'; // Hoặc @nestjs/swagger
import { CreateIncidentDto } from './create-incident.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { IncidentStatus } from '@prisma/client'; // 👈 Nhớ import cái này

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}