import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() adminName: string;
  @IsString() document: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }
}
