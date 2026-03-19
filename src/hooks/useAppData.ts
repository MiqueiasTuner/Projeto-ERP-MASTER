import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Property, Expense, InventoryItem, StockMovement, Supplier, 
  Warehouse, UserAccount, UserRole, Team, PropertyLog, 
  Quote, Task, Auction, Alert, Broker, Lead, CommercialStatus, PropertyStatus, QuoteStatus, MovementType
} from '../../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { SUPER_ADMIN_EMAILS } from '../constants';

export function useAppData(session: any, currentUserData: UserAccount | null) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [logs, setLogs] = useState<PropertyLog[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!session || !db) return;
    
    const isSuperAdminByEmail = SUPER_ADMIN_EMAILS.includes(session.email);
    if (!isSuperAdminByEmail && !currentUserData) return;
    
    const collectionsToFetch: any[] = [
      { name: 'properties', setter: setProperties },
      { name: 'expenses', setter: setExpenses },
      { name: 'inventory', setter: setInventory },
      { name: 'movements', setter: setMovements },
      { name: 'suppliers', setter: setSuppliers },
      { name: 'warehouses', setter: setWarehouses },
      { name: 'users', setter: setUsers },
      { name: 'teams', setter: setTeams },
      { name: 'logs', setter: setLogs },
      { name: 'quotes', setter: setQuotes },
      { name: 'tasks', setter: setTasks },
      { name: 'auctions', setter: setAuctions },
      { name: 'alerts', setter: setAlerts },
      { name: 'brokers', setter: setBrokers },
      { name: 'leads', setter: setLeads }
    ];

    const unsubscribes = collectionsToFetch.map(({ name, setter }) => {
      const q = query(collection(db, name));

      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        setter(data);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, name);
        console.error(`Error fetching ${name}:`, err);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [session, currentUserData?.role]);

  const addLog = async (log: Omit<PropertyLog, 'id' | 'timestamp' | 'userId' | 'userName'>, currentUser: UserAccount) => {
    await addDoc(collection(db, 'logs'), {
      ...log,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name
    });
  };

  const saveProperty = async (p: Property) => {
    const { id, ...data } = p;
    if (id) {
      await setDoc(doc(db, 'properties', id), data as any, { merge: true });
    } else {
      const docRef = doc(collection(db, 'properties'));
      await setDoc(docRef, { ...data, id: docRef.id } as any);
    }
  };

  const deleteProperty = async (id: string, isMasterUser: boolean) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este imóvel?")) return;
    await deleteDoc(doc(db, 'properties', id));
  };

  const addExpense = async (e: Expense) => {
    const { id, ...data } = e;
    const docRef = doc(collection(db, 'expenses'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const addInventoryItem = async (item: InventoryItem) => {
    const { id, ...data } = item;
    const docRef = doc(collection(db, 'inventory'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const deleteInventoryItem = async (id: string, isMasterUser: boolean) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este item?")) return;
    await deleteDoc(doc(db, 'inventory', id));
  };

  const handleAddMovement = async (m: StockMovement) => {
    const { id, ...data } = m;
    const docRef = doc(collection(db, 'movements'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const addSupplier = async (s: Supplier) => {
    const { id, ...data } = s;
    const docRef = doc(collection(db, 'suppliers'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const deleteSupplier = async (id: string, isMasterUser: boolean) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este fornecedor?")) return;
    await deleteDoc(doc(db, 'suppliers', id));
  };

  const addWarehouse = async (w: Warehouse) => {
    const { id, ...data } = w;
    const docRef = doc(collection(db, 'warehouses'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const deleteWarehouse = async (id: string, isMasterUser: boolean) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este almoxarifado?")) return;
    await deleteDoc(doc(db, 'warehouses', id));
  };

  const addQuote = async (q: Quote) => {
    const { id, ...data } = q;
    const docRef = doc(collection(db, 'quotes'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const updateQuoteStatus = async (id: string, status: QuoteStatus) => {
    await setDoc(doc(db, 'quotes', id), { status }, { merge: true });
  };

  const deleteQuote = async (id: string, isMasterUser: boolean) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este orçamento?")) return;
    await deleteDoc(doc(db, 'quotes', id));
  };

  const purchaseQuote = async (quote: Quote) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'quotes', quote.id), { status: QuoteStatus.RECEBIDO });
    
    quote.items.forEach(item => {
      const movementRef = doc(collection(db, 'movements'));
      batch.set(movementRef, {
        id: movementRef.id,
        itemId: item.itemId,
        type: MovementType.ENTRADA_COMPRA,
        quantity: item.quantity,
        date: new Date().toISOString(),
        supplierId: quote.supplierId,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        description: `Compra realizada a partir do orçamento ${quote.id}`
      });
    });
    
    await batch.commit();
  };

  const addBroker = async (b: Broker) => {
    try {
      const { id, ...data } = b;
      const docRef = doc(collection(db, 'brokers'));
      await setDoc(docRef, { ...data, id: docRef.id });
      
      await setDoc(doc(db, 'users', docRef.id), {
        name: b.name,
        email: b.email,
        role: UserRole.BROKER,
        active: true,
        permissions: {
          properties: ['view'],
          inventory: [],
          finances: [],
          teams: [],
          reports: [],
          brokers: []
        }
      });
      
      alert("Corretor cadastrado com sucesso! Ele já pode logar com as credenciais definidas.");
    } catch (error: any) {
      console.error("Error adding broker:", error);
      alert(`Erro ao cadastrar corretor: ${error.message}`);
    }
  };

  const updateBroker = async (b: Broker) => {
    const { id, ...data } = b;
    await setDoc(doc(db, 'brokers', id), data, { merge: true });
    await setDoc(doc(db, 'users', id), {
      name: b.name,
      email: b.email,
      active: b.active
    }, { merge: true });
  };

  const deleteBroker = async (id: string, isMasterUser: boolean) => {
    if (!isMasterUser) {
      alert("Apenas o Administrador Master pode excluir registros.");
      return;
    }
    if (!window.confirm("Deseja excluir este corretor?")) return;
    await deleteDoc(doc(db, 'brokers', id));
  };

  const addLead = async (l: Lead) => {
    const { id, ...data } = l;
    const docRef = doc(collection(db, 'leads'));
    await setDoc(docRef, { ...data, id: docRef.id });
  };

  const updateLead = async (l: Lead) => {
    const { id, ...data } = l;
    await setDoc(doc(db, 'leads', id), data, { merge: true });
  };

  const markPropertyAsSold = async (propertyId: string, brokerId: string, salePrice: number, saleDate: string, currentUser: UserAccount) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const batch = writeBatch(db);
    batch.update(doc(db, 'properties', propertyId), {
      status: PropertyStatus.VENDIDO,
      commercialStatus: CommercialStatus.VENDIDO,
      responsibleBrokerId: brokerId,
      salePrice: salePrice,
      saleDate: saleDate,
      availableForBrokers: false
    });

    const logRef = doc(collection(db, 'logs'));
    const log: Omit<PropertyLog, 'id'> = {
      propertyId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'BAIXA_VENDA',
      fromStatus: property.status,
      toStatus: PropertyStatus.VENDIDO,
      timestamp: new Date().toISOString(),
      details: `Venda registrada pelo corretor ID: ${brokerId}. Valor: ${salePrice}`
    };
    batch.set(logRef, log);

    await batch.commit();
    alert('Venda registrada com sucesso! O imóvel foi removido da vitrine.');
  };

  return {
    properties, expenses, inventory, movements, suppliers, warehouses, users, teams, logs, quotes, tasks, auctions, alerts, brokers, leads,
    addLog, saveProperty, deleteProperty, addExpense, addInventoryItem, deleteInventoryItem, handleAddMovement, addSupplier, deleteSupplier, addWarehouse, deleteWarehouse, addQuote, updateQuoteStatus, deleteQuote, purchaseQuote, addBroker, updateBroker, deleteBroker, addLead, updateLead, markPropertyAsSold
  };
}
