import { ProductRepository } from '../catalog/ProductRepository';

export class PricingService {
  private repo = new ProductRepository();

  calculateForSku(sku: string): number {
    return this.repo.getPrice(sku);
  }
}
