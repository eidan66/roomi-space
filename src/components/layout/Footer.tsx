'use client';

import React from 'react';

import { Building } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

const navigationItems = [
  { title: 'Home', href: '/' },
  { title: 'Academy', href: '/academy' },
  { title: 'Builder', href: '/builder' },
];

export default function Footer() {
  const { theme } = useTheme();
  return (
    <footer
      className={`mt-auto border-t transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Dream-Room Studio</span>
            </div>
            <p
              className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Where imagination meets 3D creation. Build, furnish, and share your dream
              rooms.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`block text-sm transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Created by</h3>
            <p
              className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              © 2025{' '}
              <a
                href="https://idanlevian.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                Idan Levian
              </a>
            </p>
            <p
              className={`text-xs mt-2 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}
            >
              Designed & developed with ❤️
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
