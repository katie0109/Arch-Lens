import { PricingService } from '../pricing/PricingService';

export class ProductRepository {
  private pricing = new PricingService();

  getPrice(sku: string): number {
    return this.pricing.calculateForSku(sku);
  }
}
