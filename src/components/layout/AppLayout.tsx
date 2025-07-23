"use client";
import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
// import Footer from './Footer'; // Uncomment if you have a Footer component

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const openTimer = useRef<NodeJS.Timeout | null>(null);

  // Detect RTL
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsRTL(document.dir === 'rtl');
    }
  }, []);

  // Open drawer with animation
  const openDrawer = () => {
    setIsDrawerVisible(true);
  };
  // When isDrawerVisible becomes true, set mobileMenuOpen to true on next tick
  useEffect(() => {
    if (isDrawerVisible && !mobileMenuOpen) {
      openTimer.current = setTimeout(() => setMobileMenuOpen(true), 10);
    }
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, [isDrawerVisible]);

  // Handle smooth close for mobile drawer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!mobileMenuOpen && isDrawerVisible) {
      timer = setTimeout(() => setIsDrawerVisible(false), 300); // match duration-300
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mobileMenuOpen, isDrawerVisible]);

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Overlay and Drawer above all content */}
      {isDrawerVisible && (
        <>
          {mobileMenuOpen && <style>{`body { overflow: hidden !important; }`}</style>}
          <div
            className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <div
            className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} z-60 h-screen w-72 max-w-full bg-card/90 backdrop-blur-xl shadow-2xl border border-border/40 flex flex-col p-6 space-y-6 transition-transform duration-300
              ${isRTL ? 'rounded-l-2xl' : 'rounded-r-2xl'}
              ${mobileMenuOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
            `}
            style={{ willChange: 'transform' }}
          >
            {/* You can move your drawer content here, or pass as prop */}
            <Header isMobileDrawer mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          </div>
        </>
      )}
      {/* Header always visible */}
      <Header openDrawer={openDrawer} />
      <main className="flex-1">{children}</main>
      {/* <Footer /> */}
    </div>
  );
} 