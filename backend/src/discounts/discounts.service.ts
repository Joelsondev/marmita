import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class UpsertDiscountDto {
  @IsString() cutoffTime: string; // "HH:MM"
  @IsNumber() @Min(0) @Max(100) discountValue: number;
}

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async getRule(tenantId: string) {
    return this.prisma.discountRule.findUnique({ where: { tenantId } });
  }

  async upsert(tenantId: string, dto: UpsertDiscountDto) {
    return this.prisma.discountRule.upsert({
      where: { tenantId },
      create: { tenantId, cutoffTime: dto.cutoffTime, discountValue: dto.discountValue },
      update: { cutoffTime: dto.cutoffTime, discountValue: dto.discountValue },
    });
  }

  async calculateDiscount(tenantId: string, baseAmount: number): Promise<number> {
    const rule = await this.getRule(tenantId);
    if (!rule) return 0;

    const now = new Date();
    const [cutH, cutM] = rule.cutoffTime.split(':').map(Number);
    const cutoff = new Date();
    cutoff.setHours(cutH, cutM, 0, 0);

    if (now <= cutoff) {
      return (baseAmount * Number(rule.discountValue)) / 100;
    }
    return 0;
  }
}
