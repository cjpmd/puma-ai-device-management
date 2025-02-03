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
    contentInset: 'always'
  }
};

export default config;