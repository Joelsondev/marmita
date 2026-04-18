import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsString } from 'class-validator';

export class OperatorLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Controller('auth/operator')
export class OperatorAuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: OperatorLoginDto) {
    return this.auth.loginOperator(dto.email, dto.password);
  }
}
