import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString } from 'class-validator';

export class ClientLoginDto {
  @IsString() cpf: string;
  @IsString() tenantId: string;
}

export class SelfRegisterDto {
  @IsString() registrationLinkCode: string;
  @IsString() name: string;
  @IsString() cpf: string;
  @IsString() phone: string;
}

@Controller('auth/client')
export class ClientAuthController {
  constructor(private auth: AuthService) {}

  @Get('tenants')
  getTenants(@Query('cpf') cpf: string) {
    return this.auth.getTenantsForCpf(cpf.replace(/\D/g, ''));
  }

  @Post('login')
  login(@Body() dto: ClientLoginDto) {
    return this.auth.loginCustomerByCpf(dto.cpf, dto.tenantId);
  }

  @Post('register')
  register(@Body() dto: SelfRegisterDto) {
    return this.auth.selfRegisterCustomer(dto.registrationLinkCode, dto.name, dto.cpf, dto.phone);
  }
}
