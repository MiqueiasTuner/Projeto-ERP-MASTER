import { Property, CommercialProperty, CommercialStatus, PropertyStatus } from '../../types';

/**
 * Service to handle the commercial exposure layer.
 * Filters sensitive data and provides only public property information.
 */
export const CommercialService = {
  /**
   * Returns properties filtered for commercial exposure.
   * Only includes properties that are "Finalizado" or "Liberado para Venda".
   * In our system, this corresponds to PropertyStatus.A_VENDA.
   */
  getCommercialProperties: (properties: Property[]): CommercialProperty[] => {
    return properties
      .filter(p => 
        (p.status === PropertyStatus.A_VENDA || p.status === PropertyStatus.VENDIDO)
      )
      .map(p => ({
        id: p.id,
        title: p.title || `Oportunidade em ${p.neighborhood}`,
        address: p.address,
        neighborhood: p.neighborhood,
        city: p.city,
        salePrice: p.salePrice || 0,
        description: p.description || '',
        improvements: p.improvements || '',
        images: p.images || [],
        commercialStatus: p.commercialStatus || CommercialStatus.DISPONIVEL
      }));
  },

  /**
   * Returns a JSON string of available properties for external integration.
   */
  getAvailablePropertiesJSON: (properties: Property[]): string => {
    const available = CommercialService.getCommercialProperties(properties)
      .filter(p => p.commercialStatus === CommercialStatus.DISPONIVEL);
    return JSON.stringify(available, null, 2);
  },

  /**
   * Generates a WhatsApp link for the sales kit.
   */
  getWhatsAppSalesKitLink: (property: CommercialProperty): string => {
    const publicLink = `${window.location.origin}/#/publico/imovel/${property.id}`;
    const message = encodeURIComponent(
      `Segue dados do imóvel:\n\n` +
      `*${property.title.toUpperCase()}*\n\n` +
      `Localização: ${property.neighborhood}, ${property.city}\n` +
      `Valor: R$ ${property.salePrice.toLocaleString('pt-BR')}\n\n` +
      `Confira fotos e detalhes no link abaixo:\n${publicLink}`
    );
    return `https://wa.me/?text=${message}`;
  }
};
