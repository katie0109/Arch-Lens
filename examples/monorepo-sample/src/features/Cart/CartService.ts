import { chargePayment } from '../Payment/PaymentService';
import { formatCurrency } from '../../shared/currency';

export function checkout(amount: number): string {
  const paymentResult = chargePayment(amount);
  return `Checkout successful: ${formatCurrency(paymentResult.total)}`;
}
