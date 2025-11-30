import { connect } from '../core/db';
import { PricingService } from '../service/pricing/PricingService';

const pricing = new PricingService();

export function render(): string {
  const price = pricing.quote('SKU-123');
  // 위반: UI 레이어가 core에 직접 접근
  const direct = connect();
  return `${price}:${direct}`;
}
