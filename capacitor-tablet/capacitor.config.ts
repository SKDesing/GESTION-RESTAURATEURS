import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capverde.pos',
  appName: 'CapVerde POS',
  webDir: 'out',
  
  server: {
    androidScheme: 'https',
    cleartext: true,
    url: process.env.NODE_ENV === 'development' ? 'http://192.168.1.100:3000' : undefined,
    allowNavigation: ['*']
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    loggingBehavior: 'production',
    useLegacyBridge: false,
    
    splash: {
      launchShowDuration: 2000,
      backgroundColor: '#10b981',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },

    permissions: [
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_CONNECT',
      'BLUETOOTH_SCAN',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'ACCESS_WIFI_STATE',
      'CAMERA',
      'VIBRATE',
      'WAKE_LOCK'
    ]
  },

  plugins: {
    Print: {
      enabled: true,
      printerType: 'bluetooth',
      autoConnect: true,
      timeout: 10000
    },
    
    SumUp: {
      enabled: true,
      affiliateKey: process.env.SUMUP_AFFILIATE_KEY || 'YOUR_AFFILIATE_KEY',
      merchantCode: process.env.SUMUP_MERCHANT_CODE || 'YOUR_MERCHANT_CODE',
      currency: 'EUR'
    },
    
    CashDrawer: {
      enabled: true,
      connectionType: 'bluetooth',
      autoOpen: true,
      pulseTime: 500
    },
    
    BarcodeScanner: {
      enabled: true,
      formats: ['EAN_13', 'EAN_8', 'CODE_128', 'QR_CODE'],
      lensFacing: 'back',
      showFlipCameraButton: true,
      prompt: 'Scanner le code-barres'
    },
    
    LocalNotifications: {
      smallIcon: 'ic_stat_capverde',
      iconColor: '#10b981',
      sound: 'notification.wav',
      vibrate: true
    },

    StatusBar: {
      style: 'dark',
      backgroundColor: '#10b981',
      overlay: false
    }
  }
};

export default config;