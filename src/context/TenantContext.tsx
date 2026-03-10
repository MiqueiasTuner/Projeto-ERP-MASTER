import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TenantContextData {
  organizationId: string | null;
  setOrganizationId: (id: string) => void;
  organization?: any | null;
}

const TenantContext = createContext<TenantContextData>({} as TenantContextData);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  return (
    <TenantContext.Provider value={{ organizationId, setOrganizationId, organization: null }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
};