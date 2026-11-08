import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.surveyoreveryday.app',
  appName: 'Surveyor Everyday',
  webDir: 'dist',
  android: { allowMixedContent: false },
};

export default config;
