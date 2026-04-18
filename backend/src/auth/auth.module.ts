import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AdminAuthController } from './admin-auth.controller';
import { ClientAuthController } from './client-auth.controller';
import { OperatorAuthController } from './operator-auth.controller';
import { RegistrationLinksController } from './registration-links.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '7d' },
    }),
    forwardRef(() => SubscriptionModule),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, AdminAuthController, ClientAuthController, OperatorAuthController, RegistrationLinksController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
