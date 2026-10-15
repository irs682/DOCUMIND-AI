/**
 * DOCUMIND-AI Mobile Deep Linking Configuration
 * Handles scheme: documind://
 * and Universal Links: https://app.documind.ai/
 */

import * as Linking from 'expo-linking';

export const linkingPrefixes = [
  Linking.createURL('/'),
  'documind://',
  'https://app.documind.ai',
  'http://app.documind.ai',
];

export const linkingConfig = {
  prefixes: linkingPrefixes,
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Research: 'research',
          Documents: 'documents',
          AIChat: 'chat',
          Profile: 'profile',
        },
      },
      ProjectDetail: 'research/projects/:projectId',
      StepWorkflow: 'research/projects/:projectId/step/:step',
      ManuscriptPreview: 'research/projects/:projectId/manuscript',
      UploadDocument: 'documents/upload',
      Notifications: 'notifications',
    },
  },
};

export default {
  linkingPrefixes,
  linkingConfig,
};
