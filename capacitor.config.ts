import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cricengine.app',
  appName: 'CricEngine',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
