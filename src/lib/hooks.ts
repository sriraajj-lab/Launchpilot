/**
 * Launch Pilot - Client-side data fetching hooks (SWR)
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export function useDashboard() {
  return useSWR('/api/dashboard', fetcher, { refreshInterval: 10000 });
}

export function useProducts() {
  return useSWR('/api/products', fetcher);
}

export function useProduct(id: string | null) {
  return useSWR(id ? `/api/products/${id}` : null, fetcher);
}

export function useCampaigns() {
  return useSWR('/api/campaigns', fetcher, { refreshInterval: 5000 });
}

export function useCampaign(id: string | null) {
  return useSWR(id ? `/api/campaigns/${id}` : null, fetcher, { refreshInterval: 3000 });
}

export function useAccounts() {
  return useSWR('/api/accounts', fetcher);
}

export function useTemplates() {
  return useSWR('/api/templates', fetcher);
}
