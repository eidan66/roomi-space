'use client';

import React, { useState } from 'react';

import {
  BookOpen,
  Building,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Home,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  Shield,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const isRTL = i18n.dir() === 'rtl';
  const flexDirectionClass = isRTL ? 'flex-row-reverse' : 'flex-row';

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement contact form submission
    console.log('Contact form submitted:', contactForm);
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    console.log('Newsletter subscription:', newsletterEmail);
    setNewsletterEmail('');
  };

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`lg:flex lg:gap-12 ${flexDirectionClass}`}>
          {/* Content/Links */}
          <div className="lg:w-1/2 space-y-8">
            {/* Brand Section */}
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
              <p className="text-sm text-muted-foreground max-w-md">
                {t('footer.description')}
              </p>
              {/* Newsletter Signup */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">
                  {t('footer.newsletter.title')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('footer.newsletter.description')}
                </p>
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="flex space-x-2 rtl:space-x-reverse"
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t('footer.newsletter.placeholder')}
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 hover:scale-105 transition-all duration-200 cursor-pointer"
                  >
                    <Send className="w-4 h-4 rtl:scale-x-[-1]" />
                  </button>
                </form>
              </div>
            </div>
            {/* Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Links */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {t('footer.quickLinks')}
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <Home className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('navigation.home')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/builder"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <Building className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('navigation.builder')}
                    </Link>
                  </li>

                  <li>
                    <Link
                      href="/academy"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <GraduationCap className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('navigation.academy')}
                    </Link>
                  </li>
                </ul>
              </div>
              {/* Help & Support */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">{t('footer.help')}</h3>
                {/* WhatsApp Quick Support - Prominent */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 hover:scale-105 cursor-pointer">
                  <a
                    href="https://wa.me/972525649311"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                    aria-label={t('footer.whatsapp.chatNow')}
                  >
                    <div className="bg-green-500 text-white rounded-full p-2 group-hover:bg-green-600 transition-colors duration-200">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {t('footer.whatsapp.quickHelp')}
                      </div>
                      <div className="text-xs opacity-80">
                        {t('footer.whatsapp.support')}
                      </div>
                    </div>
                  </a>
                </div>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/help"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.help')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tutorials"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.tutorials')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.faq')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/support"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.support')}
                    </Link>
                  </li>
                </ul>
              </div>
              {/* Legal & Community */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">{t('footer.legal')}</h3>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/privacy"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <Shield className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.privacy')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <FileText className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.terms')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/guidelines"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <Users className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.guidelines')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/feedback"
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
                    >
                      <Heart className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                      {t('footer.links.feedback')}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          {/* Contact Form */}
          <div className="lg:w-1/2 space-y-6">
            <div className="bg-background/50 border border-border rounded-lg p-6 space-y-4 hover:bg-background/80 transition-all duration-200">
              <h3 className="font-semibold text-foreground text-lg">
                {t('footer.contactForm.title')}
              </h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, name: e.target.value })
                    }
                    placeholder={t('footer.contactForm.placeholder.name')}
                    className="px-4 py-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50"
                    required
                  />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                    placeholder={t('footer.contactForm.placeholder.email')}
                    className="px-4 py-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50"
                    required
                  />
                </div>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, subject: e.target.value })
                  }
                  placeholder={t('footer.contactForm.placeholder.subject')}
                  className="w-full px-4 py-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50"
                  required
                />
                <textarea
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  placeholder={t('footer.contactForm.placeholder.message')}
                  rows={4}
                  className="w-full px-4 py-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50 resize-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <Mail className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                  {t('footer.contactForm.send')}
                </button>
              </form>
            </div>
          </div>
        </div>
        {/* Social Media & Copyright */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
            {/* Social Links */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <span className="text-sm font-medium text-muted-foreground">
                {t('footer.social')}:
              </span>
              <div className="flex space-x-3 rtl:space-x-reverse">
                <a
                  href="https://discord.gg/roomi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200 cursor-pointer"
                  aria-label={t('footer.social.discord')}
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a
                  href="https://youtube.com/@roomi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200 cursor-pointer"
                  aria-label={t('footer.social.youtube')}
                >
                  <GraduationCap className="w-5 h-5" />
                </a>
                <a
                  href="https://instagram.com/roomi.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200 cursor-pointer"
                  aria-label={t('footer.social.instagram')}
                >
                  <Heart className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/roomi_space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200 cursor-pointer"
                  aria-label={t('footer.social.twitter')}
                >
                  <MessageSquare className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
