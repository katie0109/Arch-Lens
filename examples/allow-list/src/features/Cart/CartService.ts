import { AdminService } from '../Admin/AdminService';
import { log } from '../../shared/logger';

const admin = new AdminService();

export class CartService {
  checkout(userId: string): string {
    log(`checkout started for ${userId}`);
    // 위반: Cart feature가 Admin feature를 직접 import
    return admin.grantAccess(userId);
  }
}
