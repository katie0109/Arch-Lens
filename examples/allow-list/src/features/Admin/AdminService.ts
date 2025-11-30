export class AdminService {
  grantAccess(userId: string): string {
    return `Granted admin access to ${userId}`;
  }
}
