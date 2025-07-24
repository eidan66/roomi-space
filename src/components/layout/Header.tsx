'use client';

import React, { useEffect, useState } from 'react';

import { Building, GraduationCap, Home, Moon, Settings, Sun, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RootState, toggleLanguage } from '@/features/store';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';

const navigationItems = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Academy', href: '/academy', icon: GraduationCap },
  { title: 'Builder', href: '/builder', icon: Building },
];

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();
  const { language } = useAppSelector((state: RootState) => state.settings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleLanguage = () => {
    dispatch(toggleLanguage());
  };

  if (!mounted) {
    // Render a placeholder or null on the server to avoid hydration mismatch
    return <header className="sticky top-0 z-50 border-b h-16" />;
  }

  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-gray-900/90 border-gray-700'
          : 'bg-white/90 border-gray-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Dream-Room Studio
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  pathname === item.href
                    ? `${
                        theme === 'dark'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700'
                      } glow-effect`
                    : `${
                        theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.title}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleLanguage}
              className="rounded-full"
            >
              <Badge variant="outline" className="text-xs">
                {language === 'en' ? '🇺🇸 EN' : '🇮🇱 HE'}
              </Badge>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
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
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
