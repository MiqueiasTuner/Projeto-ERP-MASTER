
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatCurrency } from './utils';
import { Property, Expense, InventoryItem, PropertyStatus, Broker, Lead, Auction } from './types';

class ReportService {
  private logoUrl = "https://i.postimg.cc/jsxKRsym/sale-(1).png";

  private async addHeader(pdf: jsPDF, title: string) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header background
    pdf.setFillColor(10, 25, 47); // #0A192F
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo
    try {
      // We use a small trick to add the logo if it's available
      // For now, we'll just use text as a fallback or if image fails
      pdf.setTextColor(255, 215, 0); // #FFD700
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SINTESE ERP', 20, 25);
    } catch (e) {
      pdf.setTextColor(255, 215, 0);
      pdf.setFontSize(22);
      pdf.text('SINTESE ERP', 20, 25);
    }

    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title.toUpperCase(), pageWidth - 20, 25, { align: 'right' });

    // Date
    pdf.setFontSize(8);
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 20, 32, { align: 'right' });
    
    return 45; // Return the Y position where content should start
  }

  private addFooter(pdf: jsPDF) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageCount = (pdf.internal as any).getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('© 2026 Sintese ERP - Inteligência em Gestão Imobiliária', 20, pageHeight - 12);
      pdf.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 12, { align: 'right' });
    }
  }

  async generatePropertyReport(properties: Property[], expenses: Expense[]) {
    const pdf = new jsPDF('l', 'mm', 'a4');
    let yPos = await this.addHeader(pdf, 'Relatório Geral de Imóveis');

    const tableData = properties.map(p => {
      const propertyExpenses = expenses.filter(e => e.propertyId === p.id);
      const totalExpenses = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalInvested = (p.acquisitionPrice || 0) + totalExpenses + (p.expenseMaterials || 0) + (p.legalItbi || 0) + (p.legalTaxasRegistro || 0);
      
      return [
        p.condoName || p.neighborhood || 'N/A',
        p.city,
        p.status,
        formatCurrency(p.acquisitionPrice || 0),
        formatCurrency(totalExpenses + (p.expenseMaterials || 0)),
        formatCurrency(totalInvested),
        p.salePrice ? formatCurrency(p.salePrice) : '---'
      ];
    });

    autoTable(pdf, {
      startY: yPos,
      head: [['Imóvel/Condomínio', 'Cidade', 'Status', 'Arremate', 'Reformas', 'Total Invest.', 'Venda']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [10, 25, 47], textColor: [255, 215, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    this.addFooter(pdf);
    pdf.save(`relatorio-imoveis-${Date.now()}.pdf`);
  }

  async generateInventoryReport(items: InventoryItem[]) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = await this.addHeader(pdf, 'Relatório de Estoque e Insumos');

    const tableData = items.map(item => [
      item.name,
      item.category,
      `${item.currentStock} ${item.unit}`,
      formatCurrency(item.averageCost || 0),
      formatCurrency((item.averageCost || 0) * item.currentStock),
      item.currentStock <= item.minStock ? 'CRÍTICO' : 'OK'
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [['Insumo', 'Categoria', 'Qtd', 'Custo Médio', 'Total', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47], textColor: [255, 215, 0] },
      columnStyles: {
        5: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.text[0] === 'CRÍTICO') {
            data.cell.styles.textColor = [239, 68, 68];
          } else {
            data.cell.styles.textColor = [16, 185, 129];
          }
        }
      }
    });

    this.addFooter(pdf);
    pdf.save(`relatorio-estoque-${Date.now()}.pdf`);
  }

  async generateBrokerReport(brokers: Broker[], leads: Lead[]) {
    const pdf = new jsPDF('l', 'mm', 'a4');
    let yPos = await this.addHeader(pdf, 'Relatório de Corretores e Leads');

    const tableData = brokers.map(b => {
      const brokerLeads = leads.filter(l => l.brokerId === b.id);
      return [
        b.name,
        b.realEstateAgency || 'Autônomo',
        b.phone,
        brokerLeads.length.toString(),
        brokerLeads.filter(l => l.status === 'Venda concluída').length.toString(),
        b.status
      ];
    });

    autoTable(pdf, {
      startY: yPos,
      head: [['Corretor', 'Imobiliária', 'Telefone', 'Total Leads', 'Vendas', 'Status']],
      body: tableData,
      headStyles: { fillColor: [10, 25, 47], textColor: [255, 215, 0] }
    });

    this.addFooter(pdf);
    pdf.save(`relatorio-corretores-${Date.now()}.pdf`);
  }

  async generateAuctionReport(auctions: Auction[]) {
    const pdf = new jsPDF('l', 'mm', 'a4');
    let yPos = await this.addHeader(pdf, 'Relatório de Leilões');

    const tableData = auctions.map(a => [
      a.title,
      `${a.city} - ${a.neighborhood}`,
      new Date(a.date).toLocaleDateString('pt-BR'),
      formatCurrency(a.initialPrice),
      formatCurrency(a.myMaxBid || 0),
      a.status
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [['Título', 'Localização', 'Data', 'Vl. Inicial', 'Meu Lance Máx', 'Status']],
      body: tableData,
      headStyles: { fillColor: [10, 25, 47], textColor: [255, 215, 0] }
    });

    this.addFooter(pdf);
    pdf.save(`relatorio-leiloes-${Date.now()}.pdf`);
  }

  async generateDashboardReport(elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0A192F',
      onclone: (clonedDoc) => {
        const styleTags = clonedDoc.getElementsByTagName('style');
        for (let i = 0; i < styleTags.length; i++) {
          const style = styleTags[i];
          if (style.innerHTML.includes('oklch')) {
            style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#000');
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let yPos = await this.addHeader(pdf, 'Dashboard Executivo');
    
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
    
    this.addFooter(pdf);
    pdf.save(`dashboard-executivo-${Date.now()}.pdf`);
  }

  async generatePropertyDetailReport(property: Property, expenses: Expense[]) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = await this.addHeader(pdf, `Dossiê do Imóvel: ${property.condoName || property.neighborhood}`);

    // Basic Info
    pdf.setFontSize(12);
    pdf.setTextColor(10, 25, 47);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informações Básicas', 20, yPos);
    yPos += 10;

    const basicInfo = [
      ['Endereço', property.address],
      ['Cidade/Bairro', `${property.city} / ${property.neighborhood}`],
      ['Tipo', property.type],
      ['Tamanho', `${property.sizeM2} m²`],
      ['Status Atual', property.status]
    ];

    autoTable(pdf, {
      startY: yPos,
      body: basicInfo,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Financial Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Análise Financeira', 20, yPos);
    yPos += 10;

    const financialInfo = [
      ['Preço de Arremate', formatCurrency(property.acquisitionPrice || 0)],
      ['Avaliação Bancária', formatCurrency(property.bankValuation || 0)],
      ['Comissão Leiloeiro', formatCurrency(property.auctioneerCommission || 0)],
      ['ITBI', formatCurrency(property.legalItbi || 0)],
      ['Registro/Escritura', formatCurrency(property.legalTaxasRegistro || 0)],
      ['Materiais de Reforma', formatCurrency(property.expenseMaterials || 0)]
    ];

    autoTable(pdf, {
      startY: yPos,
      body: financialInfo,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Expenses Table
    const propertyExpenses = expenses.filter(e => e.propertyId === property.id);
    if (propertyExpenses.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detalhamento de Despesas', 20, yPos);
      yPos += 10;

      const expenseData = propertyExpenses.map(e => [
        new Date(e.date).toLocaleDateString('pt-BR'),
        e.category,
        e.description,
        formatCurrency(e.amount)
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Data', 'Categoria', 'Descrição', 'Valor']],
        body: expenseData,
        headStyles: { fillColor: [10, 25, 47], textColor: [255, 215, 0] }
      });
    }

    this.addFooter(pdf);
    pdf.save(`dossie-${property.id}-${Date.now()}.pdf`);
  }
}

export const reportService = new ReportService();
