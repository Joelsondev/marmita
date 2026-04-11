import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { CustomersModule } from './customers/customers.module';
import { WalletModule } from './wallet/wallet.module';
import { MealsModule } from './meals/meals.module';
import { OptionGroupsModule } from './option-groups/option-groups.module';
import { OptionsModule } from './options/options.module';
import { OrdersModule } from './orders/orders.module';
import { DiscountsModule } from './discounts/discounts.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SuperAdminModule } from './superadmin/superadmin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantsModule,
    CustomersModule,
    WalletModule,
    MealsModule,
    OptionGroupsModule,
    OptionsModule,
    OrdersModule,
    DiscountsModule,
    SubscriptionModule,
    SuperAdminModule,
  ],
})
export class AppModule {}
