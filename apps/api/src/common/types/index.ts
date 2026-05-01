export interface AuthenticatedUser {
  accountId: string;
  userId: string;
  email: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}
