import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DiscountsModule } from '../discounts/discounts.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [DiscountsModule, WalletModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
