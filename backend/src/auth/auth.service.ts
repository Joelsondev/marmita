import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private subscription: SubscriptionService,
  ) {}

  async loginAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email }, include: { tenant: true } });
    if (!admin) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: admin.id, tenantId: admin.tenantId, role: 'admin' };
    return {
      token: this.jwt.sign(payload),
      admin: { id: admin.id, name: admin.name, email: admin.email, tenantId: admin.tenantId, tenantName: admin.tenant.name, tenantSlug: admin.tenant.slug },
    };
  }

  async loginCustomerByCpf(cpf: string, tenantId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_cpf: { tenantId, cpf } },
    });
    if (!customer) throw new UnauthorizedException('CPF não encontrado');

    const payload = { sub: customer.id, tenantId: customer.tenantId, role: 'customer', cpf: customer.cpf };
    return {
      token: this.jwt.sign(payload),
      customer: { id: customer.id, name: customer.name, cpf: customer.cpf, balance: customer.balance },
    };
  }

  async getTenantsForCpf(cpf: string) {
    const customers = await this.prisma.customer.findMany({
      where: { cpf },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return customers.map((c) => c.tenant);
  }

  async registerTenant(data: { name: string; slug: string; email: string; password: string; adminName: string; document: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { email: data.email } });
    if (existing) throw new UnauthorizedException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        passwordHash,
        document: data.document,
        admins: {
          create: {
            name: data.adminName,
            email: data.email,
            passwordHash,
          },
        },
      },
      include: { admins: true },
    });

    await this.subscription.createTrial(tenant.id);

    const admin = tenant.admins[0];
    const payload = { sub: admin.id, tenantId: tenant.id, role: 'admin' };
    return {
      token: this.jwt.sign(payload),
      admin: { id: admin.id, name: admin.name, email: admin.email, tenantId: tenant.id, tenantName: tenant.name, tenantSlug: tenant.slug },
    };
  }

  async selfRegisterCustomer(registrationLinkCode: string, name: string, cpf: string, phone: string) {
    const link = await this.prisma.registrationLink.findUnique({
      where: { code: registrationLinkCode },
      include: { tenant: true },
    });
    if (!link || !link.active) throw new NotFoundException('Link de cadastro inválido ou expirado');

    const tenant = link.tenant;
    const cleanCpf = cpf.replace(/\D/g, '');

    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_cpf: { tenantId: tenant.id, cpf: cleanCpf } },
    });

    const customer = existing ?? await this.prisma.customer.create({
      data: { tenantId: tenant.id, name, cpf: cleanCpf, phone, balance: 0 },
    });

    const payload = { sub: customer.id, tenantId: customer.tenantId, role: 'customer', cpf: customer.cpf };
    return {
      token: this.jwt.sign(payload),
      customer: { id: customer.id, name: customer.name, cpf: customer.cpf, balance: customer.balance },
    };
  }

  private generateRegistrationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRegistrationLink(tenantId: string): Promise<string> {
    let code = this.generateRegistrationCode();
    let attempts = 0;

    while (attempts < 10) {
      const existing = await this.prisma.registrationLink.findUnique({ where: { code } });
      if (!existing) break;
      code = this.generateRegistrationCode();
      attempts++;
    }

    if (attempts === 10) throw new Error('Could not generate unique code');

    const link = await this.prisma.registrationLink.create({
      data: { code, tenantId },
    });

    return link.code;
  }
}
