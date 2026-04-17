import { Controller, Get, Post, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('registration-links')
export class RegistrationLinksController {
  constructor(private auth: AuthService, private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createLink(@Request() req) {
    return this.auth.createRegistrationLink(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getLinks(@Request() req) {
    const links = await this.prisma.registrationLink.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { code: true, active: true, createdAt: true },
    });
    return links;
  }

  @Get('validate/:code')
  async validateCode(@Param('code') code: string) {
    const link = await this.prisma.registrationLink.findUnique({
      where: { code },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!link || !link.active) {
      throw new NotFoundException('Link de cadastro inválido ou expirado');
    }

    return { valid: true, tenant: link.tenant };
  }
}
