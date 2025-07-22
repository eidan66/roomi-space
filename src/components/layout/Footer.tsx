'use client';

import React from 'react';

import { Building, GraduationCap, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white/90">
                <Image
                  src="/images/roomi-logo-light.jpeg"
                  alt={t('alt.logo')}
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-lg text-foreground">Roomi</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">{t('navigation.home')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  {t('navigation.home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/builder"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Building className="w-4 h-4" />
                  {t('navigation.builder')}
                </Link>
              </li>
              <li>
                <Link
                  href="/academy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  {t('navigation.academy')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">{t('footer.about')}</h3>
            <p className="text-sm text-muted-foreground">{t('footer.description')}</p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
