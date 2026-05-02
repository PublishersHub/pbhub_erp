import { get } from './api';

export interface OrgBrandPublic {
  name: string;
  slug: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandPrimary: string | null;
  brandTagline: string | null;
  brandFaviconUrl: string | null;
  brandLoginBg: string | null;
}

export function getOrganizationBranding(slug: string) {
  return get<OrgBrandPublic>(`/api/organizations/by-slug/${encodeURIComponent(slug)}/branding`, { skipAuth: true });
}
