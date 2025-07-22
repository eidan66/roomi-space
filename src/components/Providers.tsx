'use client';

import { Suspense, useEffect, useState } from 'react';

import { ThemeProvider } from 'next-themes';
import { Provider as ReduxProvider } from 'react-redux';

import { store } from '@/features/store';

// Import i18n but don't initialize until client-side
let i18nInitialized = false;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize i18n only on client side
    if (!i18nInitialized) {
      import('@/i18n/i18n').then(() => {
        i18nInitialized = true;
        setMounted(true);
      });
    } else {
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <ReduxProvider store={store}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </ThemeProvider>
    </ReduxProvider>
  );
}
