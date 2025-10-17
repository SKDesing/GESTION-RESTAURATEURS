'use client';

import { forwardRef } from 'react';

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

interface TicketPrintProps {
  order: Order;
  restaurantInfo?: {
    name: string;
    address: string;
    phone: string;
    siret: string;
  };
}

const TicketPrint = forwardRef<HTMLDivElement, TicketPrintProps>(({ order, restaurantInfo }, ref) => {
  const defaultRestaurant = {
    name: "Restaurant CapVerde",
    address: "123 Rue de la Plage, 75001 Paris",
    phone: "01 23 45 67 89",
    siret: "12345678901234"
  };

  const restaurant = restaurantInfo || defaultRestaurant;
  const orderDate = new Date(order.timestamp);
  
  // Calculs fiscaux (TVA 10% restauration)
  const totalHT = order.total / 1.1;
  const tva = order.total - totalHT;

  // Hash NF525 (simulation - en prod utiliser vraie crypto)
  const nf525Hash = `NF525-${order.id.slice(0, 8)}-${Date.now().toString(36)}`;

  return (
    <div 
      ref={ref}
      className="bg-white p-4 font-mono text-sm max-w-[80mm] mx-auto"
      style={{ 
        width: '80mm',
        fontSize: '12px',
        lineHeight: '1.2'
      }}
    >
      
      {/* En-tête restaurant */}
      <div className="text-center border-b-2 border-dashed pb-3 mb-3">
        <h1 className="font-bold text-lg mb-1">{restaurant.name}</h1>
        <p className="text-xs">{restaurant.address}</p>
        <p className="text-xs">Tél: {restaurant.phone}</p>
        <p className="text-xs">SIRET: {restaurant.siret}</p>
      </div>

      {/* Informations commande */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between">
          <span>Ticket N°:</span>
          <span className="font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{orderDate.toLocaleDateString('fr-FR')}</span>
        </div>
        <div className="flex justify-between">
          <span>Heure:</span>
          <span>{orderDate.toLocaleTimeString('fr-FR')}</span>
        </div>
        <div className="flex justify-between">
          <span>Serveur:</span>
          <span>{order.serverName}</span>
        </div>
        {order.tableNumber && (
          <div className="flex justify-between">
            <span>Table:</span>
            <span>N°{order.tableNumber}</span>
          </div>
        )}
      </div>

      {/* Ligne séparatrice */}
      <div className="border-t border-dashed my-3"></div>

      {/* Articles commandés */}
      <div className="mb-4">
        <h3 className="font-bold mb-2">DÉTAIL COMMANDE</h3>
        {order.items.map((item) => (
          <div key={item.id} className="mb-2">
            <div className="flex justify-between">
              <span className="flex-1">{item.name}</span>
              <span className="ml-2">{item.price.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Qté: {item.quantity}</span>
              <span>Total: {(item.price * item.quantity).toFixed(2)}€</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ligne séparatrice */}
      <div className="border-t border-dashed my-3"></div>

      {/* Totaux */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Sous-total HT:</span>
          <span>{totalHT.toFixed(2)}€</span>
        </div>
        <div className="flex justify-between">
          <span>TVA 10%:</span>
          <span>{tva.toFixed(2)}€</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-1">
          <span>TOTAL TTC:</span>
          <span>{order.total.toFixed(2)}€</span>
        </div>
      </div>

      {/* Mode de paiement */}
      <div className="mb-4">
        <div className="flex justify-between font-bold">
          <span>Paiement:</span>
          <span>
            {order.paymentMethod === 'cash' && '💵 ESPÈCES'}
            {order.paymentMethod === 'card' && '💳 CARTE'}
            {order.paymentMethod === 'ticket' && '🎫 TICKET RESTO'}
          </span>
        </div>
      </div>

      {/* Ligne séparatrice */}
      <div className="border-t border-dashed my-3"></div>

      {/* Informations légales NF525 */}
      <div className="text-xs space-y-1 mb-4">
        <p className="font-bold">CERTIFICATION NF525</p>
        <p>Logiciel certifié conforme</p>
        <p>Loi anti-fraude TVA 2018</p>
        <p className="break-all">Hash: {nf525Hash}</p>
      </div>

      {/* QR Code zone (placeholder) */}
      <div className="text-center mb-4">
        <div className="border-2 border-dashed border-gray-300 p-4 mx-auto w-20 h-20 flex items-center justify-center">
          <span className="text-xs text-gray-500">QR</span>
        </div>
        <p className="text-xs mt-1">Facture numérique</p>
      </div>

      {/* Message de fin */}
      <div className="text-center text-xs border-t border-dashed pt-3">
        <p className="font-bold">Merci de votre visite !</p>
        <p>À bientôt au Restaurant CapVerde</p>
        <p className="mt-2">www.capverde-restaurant.fr</p>
      </div>

      {/* Informations techniques (masquées à l'impression) */}
      <div className="print:hidden text-xs text-gray-400 mt-4 border-t pt-2">
        <p>Ticket généré le {new Date().toLocaleString('fr-FR')}</p>
        <p>Version POS: 1.0.0</p>
      </div>
    </div>
  );
});

TicketPrint.displayName = 'TicketPrint';

export default TicketPrint;