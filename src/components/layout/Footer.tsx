'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

const navigationItems = [
  { title: 'Home', href: '/' },
  { title: 'Academy', href: '/academy' },
  { title: 'Builder', href: '/builder' },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-card border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white/90">
                <Image
                  src="/images/roomi-logo-light.jpeg"
                  alt="ROOMI Space Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-lg text-foreground">ROOMI Space</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Where imagination meets 3D creation. Build, furnish, and share your dream
              rooms.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Quick Links</h3>
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block text-sm transition-colors text-muted-foreground hover:text-foreground"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">About</h3>
            <p className="text-sm text-muted-foreground">
              Created with love for young creators everywhere. Safe, fun, and educational.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Roomi-Space Studio. Made with ❤️ for creativity.
          </p>
        </div>
      </div>
    </footer>
  );
}
