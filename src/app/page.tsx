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

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Building,
    title: 'Build Your Room',
    description: 'Draw walls, add doors and windows with intuitive 3D tools',
    color: 'from-primary to-secondary',
  },
  {
    icon: Palette,
    title: 'Furnish & Decorate',
    description: 'Drag and drop furniture with realistic physics',
    color: 'from-secondary to-accent',
  },
  {
    icon: Share2,
    title: 'Share Creations',
    description: 'Take screenshots and share your dream rooms with friends',
    color: 'from-accent to-primary',
  },
  {
    icon: Sparkles,
    title: 'Earn Rewards',
    description: 'Collect coins to unlock premium furniture and decorations',
    color: 'from-primary to-accent',
  },
];

const stats = [
  { label: 'Rooms Created', value: '10K+', icon: Building },
  { label: 'Happy Kids', value: '2.5K+', icon: Users },
  { label: 'Furniture Items', value: '500+', icon: Palette },
  { label: 'Countries', value: '25+', icon: Star },
];

export default function HomePage() {
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
                Build Your
                <br />
                <span className="relative">
                  Dream Room
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Where imagination meets 3D creation. Draw walls, place furniture, and
                bring your dream spaces to life with physics-based interactions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/builder">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-xl shadow-xl glow-effect"
                >
                  <Building className="w-5 h-5 mr-2" />
                  Start Building
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
                  Watch Tutorial
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
                        alt="ROOMI Space Logo"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-muted-foreground font-medium">3D Room Preview</p>
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
              Endless Creative Possibilities
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From drawing your first wall to sharing masterpieces, every step is designed
              to spark creativity and learning.
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
            Ready to Start Building?
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Join thousands of young creators and start building your dream room today. No
            downloads, no setup - just pure creativity!
          </p>
          <Link href="/builder">
            <Button
              size="lg"
              className="bg-card text-primary hover:bg-card/90 px-8 py-4 text-lg font-semibold rounded-xl shadow-xl"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Create Your First Room
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
