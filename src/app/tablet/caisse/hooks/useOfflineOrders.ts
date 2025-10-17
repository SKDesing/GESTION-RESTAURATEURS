'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'ticket';
  timestamp: string;
  serverName: string;
  tableNumber?: number;
  synced?: boolean;
}

const DB_NAME = 'CapVerdeOfflineDB';
const DB_VERSION = 1;
const ORDERS_STORE = 'orders';
const MENU_STORE = 'menu';

export function useOfflineOrders() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Initialisation IndexedDB
  const initDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour commandes offline
        if (!db.objectStoreNames.contains(ORDERS_STORE)) {
          const ordersStore = db.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
          ordersStore.createIndex('timestamp', 'timestamp', { unique: false });
          ordersStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store pour cache menu
        if (!db.objectStoreNames.contains(MENU_STORE)) {
          const menuStore = db.createObjectStore(MENU_STORE, { keyPath: 'id' });
          menuStore.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }, []);

  // Sauvegarde commande en mode offline
  const saveOrderOffline = useCallback(async (order: Order): Promise<void> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([ORDERS_STORE], 'readwrite');
      const store = transaction.objectStore(ORDERS_STORE);
      
      const orderWithSync = { ...order, synced: false };
      await store.add(orderWithSync);
      
      // Mettre à jour la liste des commandes en attente
      loadPendingOrders();
      
      console.log('✅ Commande sauvegardée offline:', order.id);
    } catch (error) {
      console.error('❌ Erreur sauvegarde offline:', error);
      throw error;
    }
  }, []);

  // Charger commandes en attente de sync
  const loadPendingOrders = useCallback(async (): Promise<void> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([ORDERS_STORE], 'readonly');
      const store = transaction.objectStore(ORDERS_STORE);
      const index = store.index('synced');
      
      const request = index.getAll(false); // synced = false
      
      request.onsuccess = () => {
        const orders = request.result as Order[];
        setPendingOrders(orders);
        console.log(`📦 ${orders.length} commandes en attente de sync`);
      };
    } catch (error) {
      console.error('❌ Erreur chargement commandes:', error);
    }
  }, []);

  // Synchronisation avec serveur
  const syncPendingOrders = useCallback(async (): Promise<void> => {
    if (!isOnline || pendingOrders.length === 0) return;

    setSyncStatus('syncing');
    console.log('🔄 Début synchronisation...', pendingOrders.length, 'commandes');

    try {
      const db = await initDB();
      const transaction = db.transaction([ORDERS_STORE], 'readwrite');
      const store = transaction.objectStore(ORDERS_STORE);

      for (const order of pendingOrders) {
        try {
          // Envoi au serveur
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          });

          if (response.ok) {
            // Marquer comme synchronisé
            const updatedOrder = { ...order, synced: true };
            await store.put(updatedOrder);
            console.log('✅ Commande synchronisée:', order.id);
          } else {
            console.warn('⚠️ Échec sync commande:', order.id, response.status);
          }
        } catch (error) {
          console.error('❌ Erreur sync commande:', order.id, error);
        }
      }

      // Recharger les commandes en attente
      await loadPendingOrders();
      setSyncStatus('idle');
      
      console.log('✅ Synchronisation terminée');
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      setSyncStatus('error');
    }
  }, [isOnline, pendingOrders]);

  // Cache menu pour mode offline
  const cacheMenu = useCallback(async (menuItems: any[]): Promise<void> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([MENU_STORE], 'readwrite');
      const store = transaction.objectStore(MENU_STORE);

      // Vider le cache existant
      await store.clear();

      // Ajouter nouveaux items
      for (const item of menuItems) {
        await store.add({
          ...item,
          cachedAt: new Date().toISOString()
        });
      }

      console.log('✅ Menu mis en cache:', menuItems.length, 'articles');
    } catch (error) {
      console.error('❌ Erreur cache menu:', error);
    }
  }, []);

  // Récupérer menu depuis cache
  const getCachedMenu = useCallback(async (): Promise<any[]> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([MENU_STORE], 'readonly');
      const store = transaction.objectStore(MENU_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Erreur récupération cache menu:', error);
      return [];
    }
  }, []);

  // Nettoyage commandes anciennes (> 7 jours)
  const cleanupOldOrders = useCallback(async (): Promise<void> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([ORDERS_STORE], 'readwrite');
      const store = transaction.objectStore(ORDERS_STORE);
      const index = store.index('timestamp');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const range = IDBKeyRange.upperBound(sevenDaysAgo.toISOString());
      const request = index.openCursor(range);

      let deletedCount = 0;
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const order = cursor.value as Order;
          if (order.synced) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`🧹 Nettoyage: ${deletedCount} commandes supprimées`);
        }
      };
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }, []);

  // Statistiques stockage
  const getStorageStats = useCallback(async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        
        return {
          used: Math.round(used / 1024 / 1024), // MB
          quota: Math.round(quota / 1024 / 1024), // MB
          percentage: Math.round((used / quota) * 100)
        };
      }
    } catch (error) {
      console.error('❌ Erreur stats stockage:', error);
    }
    return null;
  }, []);

  // Détection connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Connexion rétablie');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Mode hors-ligne activé');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // État initial
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync quand connexion revient
  useEffect(() => {
    if (isOnline && pendingOrders.length > 0) {
      const timer = setTimeout(() => {
        syncPendingOrders();
      }, 2000); // Délai 2s pour stabiliser connexion

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOrders.length, syncPendingOrders]);

  // Chargement initial
  useEffect(() => {
    loadPendingOrders();
    cleanupOldOrders();
  }, [loadPendingOrders, cleanupOldOrders]);

  return {
    // État
    isOnline,
    pendingOrders,
    syncStatus,
    
    // Actions
    saveOrderOffline,
    syncPendingOrders,
    loadPendingOrders,
    
    // Cache menu
    cacheMenu,
    getCachedMenu,
    
    // Utilitaires
    cleanupOldOrders,
    getStorageStats
  };
}