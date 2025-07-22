'use client';

import React from 'react';

import { Globe, LogOut, Moon, Palette, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RootState, toggleLanguage } from '@/features/store';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { language } = useAppSelector((state: RootState) => state.settings);

  const handleLanguageToggle = () => {
    dispatch(toggleLanguage());
  };

  const handleLogout = () => {
    // Mock logout
    alert(t('alerts.loggedOut'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-xl text-muted-foreground">Customize your experience</p>
        </div>

        <div className="space-y-8">
          <Card className="border-0 shadow-lg bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-lg">
                  Dark Mode
                </Label>
                <div className="flex items-center space-x-2">
                  <Sun className="w-5 h-5" />
                  <Switch
                    id="dark-mode"
                    checked={theme === 'dark'}
                    onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  />
                  <Moon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="language" className="text-lg">
                  Language
                </Label>
                <Button variant="outline" onClick={handleLanguageToggle} className="w-24">
                  <Globe className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'English' : 'עברית'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/90 dark:bg-gray-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Account</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Change Email
              </Button>
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
