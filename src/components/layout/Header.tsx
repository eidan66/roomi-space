'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Building,
  GraduationCap,
  Home,
  Lightbulb,
  Menu,
  Moon,
  Package,
  PhoneCall,
  PlayCircle,
  Settings,
  Sun,
  User,
  Users,
  Wrench,
  Lock,
  X,
} from 'lucide-react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  openDrawer?: () => void;
  isMobileDrawer?: boolean;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function Header({ openDrawer, isMobileDrawer, mobileMenuOpen, setMobileMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  // Detect RTL
  const [isRTL, setIsRTL] = useState(false);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsRTL(document.dir === 'rtl');
    }
  }, []);

  // New navigation items with icons and translation keys
  const navigationItems = [
    { title: t('navigation.home'), href: '/', icon: Home },
    { title: t('navigation.academy'), href: '/academy', icon: GraduationCap },
    { title: t('navigation.tutorials'), href: '/tutorials', icon: PlayCircle },
    { title: t('navigation.inspiration'), href: '/inspiration', icon: Lightbulb },
    { title: t('navigation.workshop'), href: '/workshop', icon: Wrench },
    { title: t('navigation.packages'), href: '/packages', icon: Package },
    {
      title: t('navigation.digitalCourse'),
      href: '#',
      icon: Lock,
      comingSoon: true,
    },
    { title: t('navigation.customerService'), href: '/customer-service', icon: PhoneCall },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null on the server to avoid hydration mismatch
    return <header className="sticky top-0 z-50 border-b h-16" />;
  }

  // If rendering as mobile drawer content
  if (isMobileDrawer && setMobileMenuOpen) {
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Roomi-Space
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t('common.close') || 'Close'}
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
        <nav className="flex flex-col space-y-2 overflow-visible">
          {navigationItems.map((item, index) =>
            item.comingSoon ? (
              <span
                key={`mobile-nav-${index}`}
                className="relative px-2.5 py-1 rounded-lg flex items-center space-x-2 text-muted-foreground opacity-60 cursor-not-allowed border border-dashed border-border bg-muted/50 group overflow-visible"
                title={item.title}
                style={{ zIndex: 1 }}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium text-xs md:text-sm">{item.title}</span>
                {/* Prominent Ribbon badge, RTL/LTR aware */}
                <span
                  className="absolute top-0 ltr:right-0 ltr:translate-x-1/2 rtl:left-0 rtl:-translate-x-1/2 z-50 px-2.5 py-0.5 text-xs font-bold text-white bg-red-600 border border-white shadow-xl rotate-[-25deg] select-none"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}
                  aria-label={t('common.comingSoon')}
                >
                  {t('common.comingSoon')}
                </span>
              </span>
            ) : (
              <Link
                key={`mobile-nav-${index}`}
                href={item.href}
                className={`relative px-2.5 py-1 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground glow-effect'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={item.title}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium text-xs md:text-sm">{item.title}</span>
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center space-x-3 mt-6">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full"
            aria-label={t('aria.themeToggle')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Link href="/profile" className="rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center w-8 h-8 ml-2">
            <User className="w-4 h-4 text-white" />
          </Link>
        </div>
      </>
    );
  }

  // Normal header
  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark' ? 'bg-card/90 border-border' : 'bg-card/90 border-border'
      }`}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Responsive header for mobile: logo and hamburger on opposite sides */}
        <div className={`flex items-center h-16 w-full xl:hidden justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Hamburger for mobile - always at start of row */}
          <button
            className="block p-2 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t('common.openMenu') || 'Open menu'}
            onClick={openDrawer}
            type="button"
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Logo - always at end of row */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <Image
                src="/images/roomi-logo-light.jpeg"
                alt={t('alt.logo')}
                width={100}
                height={100}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Roomi-Space
            </span>
          </Link>
        </div>
        {/* Desktop header (unchanged) */}
        <div className={`hidden xl:flex items-center h-16 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Logo at start */}
          <div className={isRTL ? 'order-first' : 'order-last'}>
            <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image
                  src="/images/roomi-logo-light.jpeg"
                  alt={t('alt.logo')}
                  width={100}
                  height={100}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Roomi-Space
              </span>
            </Link>
          </div>

          {/* Centered Navigation Tabs */}
          <div className="hidden xl:flex flex-1 justify-center items-center space-x-4">
            {navigationItems.map((item, index) =>
              item.comingSoon ? (
                <span
                  key={`nav-${index}`}
                  className="relative px-2.5 py-1 rounded-lg flex items-center space-x-2 text-muted-foreground opacity-60 cursor-not-allowed border border-dashed border-border bg-muted/50 group overflow-visible"
                  title={item.title}
                  style={{ zIndex: 1 }}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-xs md:text-sm">{item.title}</span>
                  {/* Prominent Ribbon badge, RTL/LTR aware */}
                  <span
                    className="absolute top-0 ltr:right-0 ltr:translate-x-1/2 rtl:left-0 rtl:-translate-x-5 z-50 px-1.5 py-0 text-xs font-bold text-white bg-red-600 border border-white shadow-xl rotate-[-35deg] select-none"
                    style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}
                    aria-label={t('common.comingSoon')}
                  >
                    {t('common.comingSoon')}
                  </span>
                </span>
              ) : (
                <Link
                  key={`nav-${index}`}
                  href={item.href}
                  className={`relative px-2.5 py-1 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground glow-effect'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={item.title}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-xs md:text-sm">{item.title}</span>
                </Link>
              )
            )}
          </div>

          {/* Right Side Controls at end */}
          <div className="hidden xl:flex items-center space-x-3 flex-shrink-0">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
              aria-label={t('aria.themeToggle')}
            >
              {mounted &&
                (theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                ))}
              {!mounted && <span className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label={t('aria.userMenu')}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>{t('user.profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>{t('user.settings')}</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {/* This block is now handled by the isMobileDrawer prop */}
    </nav>
  );
}
