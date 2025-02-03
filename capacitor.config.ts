import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovableqaecjlqraydbprsjfjdg',
  appName: 'Player Analysis',
  webDir: 'dist',
  server: {
    url: 'https://qaecjlqraydbprsjfjdg.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    scheme: 'Player Analysis',
    backgroundColor: '#ffffff',
    permissions: {
      'bluetooth-peripheral': {
        'usageDescription': 'This app needs access to Bluetooth to connect to player tracking devices'
      },
      'motion': {
        'usageDescription': 'Motion data is used to analyze player movements and performance'
      }
    }
  }
};

export default config;