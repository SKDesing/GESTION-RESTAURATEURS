'use client';

import { useState, useCallback, useRef } from 'react';

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
}

interface PrinterConfig {
  type: 'bluetooth' | 'wifi' | 'usb' | 'browser';
  deviceId?: string;
  ipAddress?: string;
  port?: number;
}

export function usePrinter() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'ready' | 'busy' | 'error' | 'offline'>('ready');
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterConfig | null>(null);
  const printWindowRef = useRef<Window | null>(null);

  // Commandes ESC/POS pour imprimantes thermiques
  const ESC_POS = {
    INIT: '\x1B\x40',           // Initialiser
    ALIGN_CENTER: '\x1B\x61\x01', // Centrer
    ALIGN_LEFT: '\x1B\x61\x00',   // Aligner gauche
    BOLD_ON: '\x1B\x45\x01',      // Gras ON
    BOLD_OFF: '\x1B\x45\x00',     // Gras OFF
    UNDERLINE_ON: '\x1B\x2D\x01', // Souligné ON
    UNDERLINE_OFF: '\x1B\x2D\x00', // Souligné OFF
    FONT_SMALL: '\x1B\x4D\x01',   // Police petite
    FONT_NORMAL: '\x1B\x4D\x00',  // Police normale
    CUT_PAPER: '\x1D\x56\x00',    // Couper papier
    OPEN_DRAWER: '\x1B\x70\x00\x19\x64', // Ouvrir tiroir-caisse
    FEED_LINE: '\x0A',            // Saut de ligne
    FEED_LINES: '\x1B\x64\x03'   // 3 sauts de ligne
  };

  // Génération ticket ESC/POS
  const generateESCPOSTicket = useCallback((order: Order): string => {
    const restaurant = {
      name: "Restaurant CapVerde",
      address: "123 Rue de la Plage, 75001 Paris",
      phone: "01 23 45 67 89"
    };

    const orderDate = new Date(order.timestamp);
    const totalHT = order.total / 1.1;
    const tva = order.total - totalHT;

    let ticket = '';
    
    // Initialisation
    ticket += ESC_POS.INIT;
    
    // En-tête centré
    ticket += ESC_POS.ALIGN_CENTER;
    ticket += ESC_POS.BOLD_ON;
    ticket += restaurant.name + '\n';
    ticket += ESC_POS.BOLD_OFF;
    ticket += restaurant.address + '\n';
    ticket += restaurant.phone + '\n';
    ticket += '================================\n';
    
    // Informations commande
    ticket += ESC_POS.ALIGN_LEFT;
    ticket += `Ticket: ${order.id.slice(0, 8).toUpperCase()}\n`;
    ticket += `Date: ${orderDate.toLocaleDateString('fr-FR')}\n`;
    ticket += `Heure: ${orderDate.toLocaleTimeString('fr-FR')}\n`;
    ticket += `Serveur: ${order.serverName}\n`;
    if (order.tableNumber) {
      ticket += `Table: N°${order.tableNumber}\n`;
    }
    ticket += '--------------------------------\n';
    
    // Articles
    ticket += ESC_POS.BOLD_ON;
    ticket += 'DETAIL COMMANDE\n';
    ticket += ESC_POS.BOLD_OFF;
    
    order.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      ticket += `${item.name}\n`;
      ticket += `  ${item.quantity} x ${item.price.toFixed(2)}€ = ${itemTotal.toFixed(2)}€\n`;
    });
    
    ticket += '--------------------------------\n';
    
    // Totaux
    ticket += `Sous-total HT: ${totalHT.toFixed(2)}€\n`;
    ticket += `TVA 10%: ${tva.toFixed(2)}€\n`;
    ticket += ESC_POS.BOLD_ON;
    ticket += `TOTAL TTC: ${order.total.toFixed(2)}€\n`;
    ticket += ESC_POS.BOLD_OFF;
    
    // Paiement
    const paymentLabel = {
      cash: '💵 ESPECES',
      card: '💳 CARTE',
      ticket: '🎫 TICKET RESTO'
    };
    ticket += `Paiement: ${paymentLabel[order.paymentMethod]}\n`;
    
    ticket += '================================\n';
    ticket += ESC_POS.ALIGN_CENTER;
    ticket += 'Merci de votre visite !\n';
    ticket += 'A bientôt au Restaurant CapVerde\n';
    
    // Coupe papier et ouverture tiroir
    ticket += ESC_POS.FEED_LINES;
    ticket += ESC_POS.CUT_PAPER;
    
    return ticket;
  }, []);

  // Impression Bluetooth (Capacitor plugin)
  const printBluetooth = useCallback(async (order: Order): Promise<void> => {
    try {
      // Vérifier si Capacitor est disponible
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const { Capacitor } = window as any;
        
        if (Capacitor.isNativePlatform()) {
          const { Print } = await import('@capacitor/print');
          
          const escposData = generateESCPOSTicket(order);
          
          await Print.print({
            content: escposData,
            printerType: 'bluetooth'
          });
          
          console.log('✅ Impression Bluetooth réussie');
          return;
        }
      }
      
      throw new Error('Bluetooth non disponible');
    } catch (error) {
      console.error('❌ Erreur impression Bluetooth:', error);
      throw error;
    }
  }, [generateESCPOSTicket]);

  // Impression WiFi/réseau
  const printWiFi = useCallback(async (order: Order, config: PrinterConfig): Promise<void> => {
    try {
      if (!config.ipAddress) throw new Error('Adresse IP requise');
      
      const escposData = generateESCPOSTicket(order);
      
      // Envoi via WebSocket ou fetch selon imprimante
      const response = await fetch(`http://${config.ipAddress}:${config.port || 9100}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: escposData
      });
      
      if (!response.ok) throw new Error('Erreur réseau imprimante');
      
      console.log('✅ Impression WiFi réussie');
    } catch (error) {
      console.error('❌ Erreur impression WiFi:', error);
      throw error;
    }
  }, [generateESCPOSTicket]);

  // Impression navigateur (fallback)
  const printBrowser = useCallback(async (order: Order): Promise<void> => {
    try {
      // Créer contenu HTML pour impression
      const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket ${order.id}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; }
            }
            body { width: 80mm; font-family: monospace; font-size: 12px; line-height: 1.2; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px dashed #000; margin: 10px 0; }
            .item { margin-bottom: 5px; }
            .item-details { margin-left: 10px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="center bold">Restaurant CapVerde</div>
          <div class="center">123 Rue de la Plage, 75001 Paris</div>
          <div class="center">01 23 45 67 89</div>
          <div class="separator"></div>
          
          <div>Ticket: ${order.id.slice(0, 8).toUpperCase()}</div>
          <div>Date: ${new Date(order.timestamp).toLocaleDateString('fr-FR')}</div>
          <div>Heure: ${new Date(order.timestamp).toLocaleTimeString('fr-FR')}</div>
          <div>Serveur: ${order.serverName}</div>
          ${order.tableNumber ? `<div>Table: N°${order.tableNumber}</div>` : ''}
          
          <div class="separator"></div>
          <div class="bold">DÉTAIL COMMANDE</div>
          
          ${order.items.map(item => `
            <div class="item">
              <div>${item.name}</div>
              <div class="item-details">
                ${item.quantity} x ${item.price.toFixed(2)}€ = ${(item.price * item.quantity).toFixed(2)}€
              </div>
            </div>
          `).join('')}
          
          <div class="separator"></div>
          <div>Sous-total HT: ${(order.total / 1.1).toFixed(2)}€</div>
          <div>TVA 10%: ${(order.total - order.total / 1.1).toFixed(2)}€</div>
          <div class="bold">TOTAL TTC: ${order.total.toFixed(2)}€</div>
          
          <div>Paiement: ${
            order.paymentMethod === 'cash' ? 'ESPÈCES' :
            order.paymentMethod === 'card' ? 'CARTE' : 'TICKET RESTO'
          }</div>
          
          <div class="separator"></div>
          <div class="center">Merci de votre visite !</div>
          <div class="center">À bientôt au Restaurant CapVerde</div>
        </body>
        </html>
      `;
      
      // Ouvrir fenêtre d'impression
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      if (!printWindow) throw new Error('Popup bloqué');
      
      printWindow.document.write(ticketHTML);
      printWindow.document.close();
      
      // Attendre chargement puis imprimer
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
      console.log('✅ Impression navigateur lancée');
    } catch (error) {
      console.error('❌ Erreur impression navigateur:', error);
      throw error;
    }
  }, []);

  // Impression cuisine (commande uniquement)
  const printKitchenOrder = useCallback(async (order: Order): Promise<void> => {
    try {
      const kitchenTicket = `
        ================================
        🍽️ COMMANDE CUISINE
        ================================
        
        Ticket: ${order.id.slice(0, 8).toUpperCase()}
        Heure: ${new Date(order.timestamp).toLocaleTimeString('fr-FR')}
        ${order.tableNumber ? `Table: N°${order.tableNumber}` : 'COMPTOIR'}
        Serveur: ${order.serverName}
        
        --------------------------------
        PLATS À PRÉPARER:
        --------------------------------
        
        ${order.items.map(item => `
        ${item.quantity}x ${item.name.toUpperCase()}
        `).join('')}
        
        ================================
        Total articles: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}
        ================================
      `;
      
      // Impression sur imprimante cuisine (même logique que ticket client)
      if (connectedPrinter?.type === 'bluetooth') {
        await printBluetooth(order);
      } else if (connectedPrinter?.type === 'wifi') {
        await printWiFi(order, connectedPrinter);
      } else {
        // Fallback navigateur avec contenu cuisine
        const printWindow = window.open('', '_blank', 'width=300,height=400');
        if (printWindow) {
          printWindow.document.write(`<pre>${kitchenTicket}</pre>`);
          printWindow.document.close();
          printWindow.print();
          printWindow.close();
        }
      }
      
      console.log('✅ Commande envoyée en cuisine');
    } catch (error) {
      console.error('❌ Erreur impression cuisine:', error);
      throw error;
    }
  }, [connectedPrinter, printBluetooth, printWiFi]);

  // Fonction principale d'impression
  const printTicket = useCallback(async (order: Order): Promise<void> => {
    setIsPrinting(true);
    setPrinterStatus('busy');
    
    try {
      // Tentative impression selon configuration
      if (connectedPrinter?.type === 'bluetooth') {
        await printBluetooth(order);
      } else if (connectedPrinter?.type === 'wifi') {
        await printWiFi(order, connectedPrinter);
      } else {
        // Fallback navigateur
        await printBrowser(order);
      }
      
      setPrinterStatus('ready');
      
      // Ouvrir tiroir-caisse si paiement espèces
      if (order.paymentMethod === 'cash') {
        await openCashDrawer();
      }
      
    } catch (error) {
      console.error('❌ Erreur impression:', error);
      setPrinterStatus('error');
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, [connectedPrinter, printBluetooth, printWiFi, printBrowser]);

  // Ouverture tiroir-caisse
  const openCashDrawer = useCallback(async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && 'Capacitor' in window) {
        const { Capacitor } = window as any;
        
        if (Capacitor.isNativePlatform()) {
          // Plugin Capacitor pour tiroir-caisse
          const { CashDrawer } = await import('@capacitor/cash-drawer');
          await CashDrawer.open();
          console.log('✅ Tiroir-caisse ouvert');
          return;
        }
      }
      
      // Fallback : commande ESC/POS via imprimante
      if (connectedPrinter) {
        console.log('💰 Ouverture tiroir-caisse via imprimante');
        // Envoyer commande ESC/POS d'ouverture
      }
    } catch (error) {
      console.error('❌ Erreur ouverture tiroir:', error);
    }
  }, [connectedPrinter]);

  // Configuration imprimante
  const configurePrinter = useCallback((config: PrinterConfig): void => {
    setConnectedPrinter(config);
    setPrinterStatus('ready');
    console.log('🖨️ Imprimante configurée:', config);
  }, []);

  // Test impression
  const testPrint = useCallback(async (): Promise<void> => {
    const testOrder: Order = {
      id: 'TEST-' + Date.now(),
      items: [
        { id: '1', name: 'Test Article', price: 10.00, quantity: 1 }
      ],
      total: 10.00,
      paymentMethod: 'cash',
      timestamp: new Date().toISOString(),
      serverName: 'Test',
      tableNumber: 99
    };
    
    await printTicket(testOrder);
  }, [printTicket]);

  return {
    // État
    isPrinting,
    printerStatus,
    connectedPrinter,
    
    // Actions
    printTicket,
    printKitchenOrder,
    openCashDrawer,
    configurePrinter,
    testPrint,
    
    // Utilitaires
    generateESCPOSTicket
  };
}