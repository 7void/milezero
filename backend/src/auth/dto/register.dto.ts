import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, ServiceType } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'rahul.sharma@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CUSTOMER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.CUSTOMER;

  @ApiPropertyOptional({ example: 'Sharma Enterprises' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiPropertyOptional({ enum: ServiceType, default: ServiceType.B2C })
  @IsEnum(ServiceType)
  @IsOptional()
  defaultServiceType?: ServiceType;

  @ApiPropertyOptional({ example: 'BIKE' })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'KA-01-AB-1234' })
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @ApiPropertyOptional({ example: 'DL-KA-2022-98765' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
