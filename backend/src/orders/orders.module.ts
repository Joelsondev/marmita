import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DiscountsModule } from '../discounts/discounts.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [DiscountsModule, WalletModule, AuditLogsModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
