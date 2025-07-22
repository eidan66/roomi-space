import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ROOMI Space - Build Your Dream Room',
  description:
    'Where imagination meets 3D creation. Build, furnish, and share your dream rooms with ROOMI Space.',
  icons: {
    icon: [
      { url: '/images/roomi-logo-light.jpeg', sizes: '32x32', type: 'image/jpeg' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/images/roomi-logo-light.jpeg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};
