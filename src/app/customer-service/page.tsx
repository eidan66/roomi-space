'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CustomerServicePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">{t('navigation.customerService')}</h1>
      <p className="text-lg text-muted-foreground">{t('common.comingSoon')}</p>
    </div>
  );
} 