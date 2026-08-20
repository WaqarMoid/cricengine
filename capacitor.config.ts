import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cricengine.app',
  appName: 'CricEngine',
  webDir: 'out',
  server: {
    url: 'https://cricengine.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },
};

export default config;

