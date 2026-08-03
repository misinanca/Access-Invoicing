import { useEffect, useState } from 'react';

export const COMPANY_STORAGE_KEY = 'invoice-db-company-id';
export const COMPANY_CHANGE_EVENT = 'invoice-db-company-change';

export function getSelectedCompanyId(): string {
  if (typeof window === 'undefined') return '1';
  return window.localStorage.getItem(COMPANY_STORAGE_KEY) ?? '1';
}

export function setSelectedCompanyId(companyId: string): void {
  window.localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  window.dispatchEvent(new Event(COMPANY_CHANGE_EVENT));
}

export function useSelectedCompanyId(): string {
  const [companyId, setCompanyId] = useState(getSelectedCompanyId);

  useEffect(() => {
    const handleCompanyChange = () => setCompanyId(getSelectedCompanyId());
    window.addEventListener(COMPANY_CHANGE_EVENT, handleCompanyChange);
    return () => window.removeEventListener(COMPANY_CHANGE_EVENT, handleCompanyChange);
  }, []);

  return companyId;
}