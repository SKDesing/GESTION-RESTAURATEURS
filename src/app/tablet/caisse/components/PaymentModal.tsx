'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentModalProps {
  total: number;
  onPay: (method: 'cash' | 'card' | 'ticket') => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function PaymentModal({ total, onPay, onCancel, isProcessing }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'ticket' | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [showNumpad, setShowNumpad] = useState(false);

  // Calcul rendu monnaie
  const cashValue = parseFloat(cashAmount) || 0;
  const change = cashValue - total;

  // Boutons numpad
  const numpadButtons = [
    '1', '2', '3',
    '4', '5', '6', 
    '7', '8', '9',
    '0', '.', '⌫'
  ];

  const handleNumpadClick = (value: string) => {
    if (value === '⌫') {
      setCashAmount(prev => prev.slice(0, -1));
    } else if (value === '.' && !cashAmount.includes('.')) {
      setCashAmount(prev => prev + '.');
    } else if (value !== '.') {
      setCashAmount(prev => prev + value);
    }
  };

  const handleCashPayment = () => {
    if (cashValue >= total) {
      onPay('cash');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              💳 Paiement
            </h2>
            <p className="text-5xl font-bold text-green-600">
              {total.toFixed(2)}€
            </p>
          </div>

          {!paymentMethod ? (
            /* Sélection méthode paiement */
            <div className="grid grid-cols-3 gap-6 mb-8">
              
              {/* Espèces */}
              <button
                onClick={() => {
                  setPaymentMethod('cash');
                  setShowNumpad(true);
                }}
                className="bg-green-100 hover:bg-green-200 rounded-2xl p-8 transition-all
                           hover:scale-105 active:scale-95 border-2 border-transparent
                           hover:border-green-300"
              >
                <div className="text-6xl mb-4">💵</div>
                <h3 className="text-xl font-bold text-green-700">Espèces</h3>
                <p className="text-sm text-green-600 mt-2">Paiement liquide</p>
              </button>

              {/* Carte bancaire */}
              <button
                onClick={() => setPaymentMethod('card')}
                className="bg-blue-100 hover:bg-blue-200 rounded-2xl p-8 transition-all
                           hover:scale-105 active:scale-95 border-2 border-transparent
                           hover:border-blue-300"
              >
                <div className="text-6xl mb-4">💳</div>
                <h3 className="text-xl font-bold text-blue-700">Carte</h3>
                <p className="text-sm text-blue-600 mt-2">CB / Sans contact</p>
              </button>

              {/* Ticket restaurant */}
              <button
                onClick={() => setPaymentMethod('ticket')}
                className="bg-orange-100 hover:bg-orange-200 rounded-2xl p-8 transition-all
                           hover:scale-105 active:scale-95 border-2 border-transparent
                           hover:border-orange-300"
              >
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-xl font-bold text-orange-700">Ticket</h3>
                <p className="text-sm text-orange-600 mt-2">Ticket restaurant</p>
              </button>
            </div>
          ) : paymentMethod === 'cash' ? (
            /* Interface paiement espèces */
            <div className="space-y-6">
              
              {/* Montant saisi */}
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <p className="text-lg text-gray-600 mb-2">Montant reçu</p>
                <p className="text-4xl font-bold text-gray-800">
                  {cashAmount || '0'}€
                </p>
                
                {/* Rendu monnaie */}
                {cashValue > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-white border-2">
                    {change >= 0 ? (
                      <div className="text-green-600">
                        <p className="text-sm">Rendu monnaie</p>
                        <p className="text-2xl font-bold">{change.toFixed(2)}€</p>
                      </div>
                    ) : (
                      <div className="text-red-600">
                        <p className="text-sm">Montant insuffisant</p>
                        <p className="text-xl font-bold">
                          Manque {Math.abs(change).toFixed(2)}€
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Numpad */}
              {showNumpad && (
                <div className="grid grid-cols-3 gap-3">
                  {numpadButtons.map((btn) => (
                    <button
                      key={btn}
                      onClick={() => handleNumpadClick(btn)}
                      className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl
                                 text-2xl font-bold transition-all active:scale-95"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              )}

              {/* Boutons rapides */}
              <div className="grid grid-cols-4 gap-3">
                {[total, total + 5, total + 10, total + 20].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashAmount(amount.toFixed(2))}
                    className="py-3 bg-blue-100 hover:bg-blue-200 rounded-xl
                               font-semibold text-blue-700 transition-all active:scale-95"
                  >
                    {amount.toFixed(2)}€
                  </button>
                ))}
              </div>

              {/* Bouton validation */}
              <button
                onClick={handleCashPayment}
                disabled={cashValue < total || isProcessing}
                className={`w-full py-4 rounded-2xl font-bold text-xl transition-all
                  ${cashValue >= total && !isProcessing
                    ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isProcessing ? '⏳ Traitement...' : '✅ Valider paiement'}
              </button>
            </div>
          ) : paymentMethod === 'card' ? (
            /* Interface paiement carte */
            <div className="text-center space-y-6">
              <div className="bg-blue-50 rounded-2xl p-8">
                <div className="text-8xl mb-4">💳</div>
                <h3 className="text-2xl font-bold text-blue-700 mb-4">
                  Paiement par carte
                </h3>
                <p className="text-blue-600 mb-6">
                  Présentez la carte sur le lecteur
                </p>
                
                {/* Animation attente */}
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
                </div>
                
                <button
                  onClick={() => onPay('card')}
                  disabled={isProcessing}
                  className="bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold
                             hover:bg-blue-600 transition-all active:scale-95
                             disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '⏳ Traitement...' : '✅ Confirmer paiement'}
                </button>
              </div>
            </div>
          ) : (
            /* Interface ticket restaurant */
            <div className="text-center space-y-6">
              <div className="bg-orange-50 rounded-2xl p-8">
                <div className="text-8xl mb-4">🎫</div>
                <h3 className="text-2xl font-bold text-orange-700 mb-4">
                  Ticket restaurant
                </h3>
                <p className="text-orange-600 mb-6">
                  Scannez ou saisissez le numéro du ticket
                </p>
                
                <button
                  onClick={() => onPay('ticket')}
                  disabled={isProcessing}
                  className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold
                             hover:bg-orange-600 transition-all active:scale-95
                             disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '⏳ Traitement...' : '✅ Valider ticket'}
                </button>
              </div>
            </div>
          )}

          {/* Boutons navigation */}
          <div className="flex gap-4 mt-8">
            {paymentMethod ? (
              <button
                onClick={() => {
                  setPaymentMethod(null);
                  setCashAmount('');
                  setShowNumpad(false);
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold
                           hover:bg-gray-300 transition-all active:scale-95"
              >
                ← Retour
              </button>
            ) : null}
            
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-semibold
                         hover:bg-red-200 transition-all active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ❌ Annuler
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}