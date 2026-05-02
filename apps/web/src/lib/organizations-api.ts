import { patch } from './api';

export interface OrganizationBrand {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandPrimary: string | null;
  brandTagline: string | null;
}

export interface UpdateBrandingPayload {
  brandName?: string | null;
  brandLogoUrl?: string | null;
  brandPrimary?: string | null;
  brandTagline?: string | null;
}

export function updateBranding(payload: UpdateBrandingPayload) {
  return patch<OrganizationBrand>('/api/organizations/current', payload);
}
