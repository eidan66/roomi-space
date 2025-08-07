'use client';

import React from 'react';

import {
  ArrowRight,
  Building,
  Palette,
  Play,
  Share2,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Building,
      title: t('homepage.features.buildRoom'),
      description: t('homepage.features.buildRoomDesc'),
      color: 'from-primary to-secondary',
    },

    {
      icon: Share2,
      title: t('homepage.features.shareCreations'),
      description: t('homepage.features.shareCreationsDesc'),
      color: 'from-accent to-primary',
    },
    {
      icon: Sparkles,
      title: t('homepage.features.earnRewards'),
      description: t('homepage.features.earnRewardsDesc'),
      color: 'from-primary to-accent',
    },
  ];

  const stats = [
    {
      label: t('homepage.stats.roomsCreated'),
      value: t('homepage.stats.roomsValue'),
      icon: Building,
    },
    {
      label: t('homepage.stats.happyKids'),
      value: t('homepage.stats.kidsValue'),
      icon: Users,
    },
    {
      label: t('homepage.stats.furnitureItems'),
      value: t('homepage.stats.furnitureValue'),
      icon: Palette,
    },
    {
      label: t('homepage.stats.countries'),
      value: t('homepage.stats.countriesValue'),
      icon: Star,
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-secondary/20 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent/20 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-primary/20 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>

      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
                {t('homepage.hero.titlePart1')}
                <br />
                <span className="relative">
                  {t('homepage.hero.titlePart2')}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {t('homepage.hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/builder">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-xl shadow-xl glow-effect"
                >
                  <Building className="w-5 h-5 mr-2" />
                  {t('homepage.hero.startBuilding')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link href="/academy">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold rounded-xl border-2"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t('homepage.hero.watchTutorial')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-20 relative">
            <div className="bg-gradient-to-r from-muted to-accent/20 rounded-3xl p-8 mx-auto max-w-4xl">
              <div className="aspect-video bg-gradient-to-br from-card to-muted rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-muted/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-2xl mx-auto flex items-center justify-center shadow-xl overflow-hidden bg-white/90">
                      <Image
                        src="/images/roomi-logo-light.jpeg"
                        alt={t('alt.logo')}
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      {t('room.preview3d')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-muted/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                  <stat.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              {t('homepage.features.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('homepage.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 bg-card/80 backdrop-blur-sm"
              >
                <CardContent className="p-8 text-center space-y-4">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
            {t('homepage.cta.title')}
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            {t('homepage.cta.subtitle')}
          </p>
          <Link href="/builder">
            <Button
              size="lg"
              className="bg-card text-primary hover:bg-card/90 px-8 py-4 text-lg font-semibold rounded-xl shadow-xl"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t('homepage.cta.createRoom')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
