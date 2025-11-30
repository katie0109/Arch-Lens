import { connect } from '../../core/db';

export class PricingService {
  private connection = connect();

  quote(productId: string): string {
    return `${productId}:${this.connection}`;
  }
}
