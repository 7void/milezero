import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          name: dto.name.trim(),
          phone: dto.phone,
          role: dto.role || Role.CUSTOMER,
        },
      });

      if (createdUser.role === Role.CUSTOMER) {
        await tx.customerProfile.create({
          data: {
            userId: createdUser.id,
            companyName: dto.companyName,
            gstNumber: dto.gstNumber,
            defaultServiceType: dto.defaultServiceType || 'B2C',
          },
        });
      } else if (createdUser.role === Role.AGENT) {
        await tx.agentProfile.create({
          data: {
            userId: createdUser.id,
            vehicleType: dto.vehicleType || 'BIKE',
            vehicleNumber: dto.vehicleNumber,
            licenseNumber: dto.licenseNumber,
            availabilityStatus: 'AVAILABLE',
          },
        });
      }

      return createdUser;
    });

    return this.generateAuthResponse(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        customerProfile: true,
        agentProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthResponse(user.id, user.email, user.role, user.name, user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        agentProfile: {
          include: {
            currentZone: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  private generateAuthResponse(
    userId: string,
    email: string,
    role: Role,
    name: string,
    fullUser?: any,
  ) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: userId,
        email,
        name,
        role,
        customerProfile: fullUser?.customerProfile || null,
        agentProfile: fullUser?.agentProfile || null,
      },
    };
  }
}
