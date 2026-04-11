import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Controller('auth/admin')
export class AdminAuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }
}
