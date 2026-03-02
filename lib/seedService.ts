
import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';

export const seedInitialData = async () => {
  try {
    // Check if we already have data to avoid duplicates
    const q = query(collection(db, 'inventory'), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error("O banco de dados já possui dados. Seed cancelado para evitar duplicidade.");
    }

    // 1. Seed Inventory Items
    const inventoryItems = [
      { name: 'Cimento CP-II 50kg', category: 'Básico', unit: 'Saco', currentStock: 150, minStock: 50, unitPrice: 32.50 },
      { name: 'Tijolo Baiano 8 Furos', category: 'Básico', unit: 'Milheiro', currentStock: 12, minStock: 5, unitPrice: 850.00 },
      { name: 'Areia Lavada Fina', category: 'Básico', unit: 'm³', currentStock: 25, minStock: 10, unitPrice: 120.00 },
      { name: 'Fio Flexível 2.5mm Azul', category: 'Elétrica', unit: 'Rolo 100m', currentStock: 8, minStock: 3, unitPrice: 215.00 },
      { name: 'Piso Porcelanato 60x60', category: 'Acabamento', unit: 'm²', currentStock: 320, minStock: 100, unitPrice: 58.90 },
    ];

    for (const item of inventoryItems) {
      await addDoc(collection(db, 'inventory'), item);
    }

    // 2. Seed Suppliers
    const suppliers = [
      { name: 'ConstruMais Materiais', contact: 'João Silva', phone: '(11) 98888-7777', email: 'vendas@construmais.com', category: 'Materiais Básicos' },
      { name: 'EletroVolt Soluções', contact: 'Maria Souza', phone: '(11) 97777-6666', email: 'contato@eletrovolt.com', category: 'Elétrica' },
    ];

    for (const supplier of suppliers) {
      await addDoc(collection(db, 'suppliers'), supplier);
    }

    // 3. Seed Properties
    const properties = [
      { 
        title: 'Residencial Bella Vista - Casa 04', 
        address: 'Rua das Palmeiras, 123 - Jardim Europa', 
        type: 'Casa', 
        status: 'Em Construção', 
        price: 450000, 
        area: 120, 
        bedrooms: 3, 
        bathrooms: 2, 
        description: 'Casa moderna com acabamento de alto padrão em condomínio fechado.',
        images: ['https://picsum.photos/seed/house1/800/600']
      },
      { 
        title: 'Edifício Horizonte - Apto 802', 
        address: 'Av. Central, 500 - Centro', 
        type: 'Apartamento', 
        status: 'Pronto para Morar', 
        price: 320000, 
        area: 65, 
        bedrooms: 2, 
        bathrooms: 1, 
        description: 'Apartamento compacto e funcional, ideal para investimento ou primeiro imóvel.',
        images: ['https://picsum.photos/seed/apt1/800/600']
      }
    ];

    for (const property of properties) {
      await addDoc(collection(db, 'properties'), property);
    }

    return { success: true, message: "Banco de dados populado com sucesso!" };
  } catch (error: any) {
    console.error("Seed error:", error);
    return { success: false, message: error.message || "Erro ao popular banco de dados." };
  }
};
