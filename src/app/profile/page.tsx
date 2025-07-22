'use client';

import React, { useState } from 'react';

import {
  Award,
  Building,
  Camera,
  Download,
  Share2,
  Star,
  Trophy,
  User,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProfilePage() {
  const [user] = useState({
    name: 'Young Creator',
    email: 'creator@example.com',
    joinDate: 'January 2025',
    level: 5,
    totalRooms: 8,
    totalShares: 12,
    achievements: 6,
    coins: 1200,
  });

  const achievements = [
    {
      id: 1,
      name: 'First Room',
      description: 'Built your first room',
      earned: true,
      date: 'Jan 15',
    },
    {
      id: 2,
      name: 'Decorator',
      description: 'Placed 50+ furniture items',
      earned: true,
      date: 'Jan 18',
    },
    {
      id: 3,
      name: 'Architect',
      description: 'Created 5 different rooms',
      earned: true,
      date: 'Jan 20',
    },
    {
      id: 4,
      name: 'Social Builder',
      description: 'Shared 10 room screenshots',
      earned: false,
      date: null,
    },
    {
      id: 5,
      name: 'Master Builder',
      description: 'Reach level 10',
      earned: false,
      date: null,
    },
    {
      id: 6,
      name: 'Coin Collector',
      description: 'Earn 1000 coins',
      earned: false,
      date: null,
    },
  ];

  const recentRooms = [
    {
      id: 1,
      name: 'Cozy Bedroom',
      created: '2 days ago',
      coins: 45,
      screenshot: null,
    },
    {
      id: 2,
      name: 'Living Room',
      created: '5 days ago',
      coins: 32,
      screenshot: null,
    },
    {
      id: 3,
      name: 'Kitchen Space',
      created: '1 week ago',
      coins: 28,
      screenshot: null,
    },
    {
      id: 4,
      name: 'Study Room',
      created: '2 weeks ago',
      coins: 15,
      screenshot: null,
    },
  ];

  const stats = [
    {
      label: 'Rooms Built',
      value: user.totalRooms,
      icon: Building,
      color: 'text-blue-600',
    },
    {
      label: 'Screenshots Shared',
      value: user.totalShares,
      icon: Share2,
      color: 'text-green-600',
    },
    {
      label: 'Achievements',
      value: user.achievements,
      icon: Trophy,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/20">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8 border-0 shadow-lg bg-card/90 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-2xl font-bold">
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <Button size="icon" className="absolute -bottom-2 -right-2 rounded-full">
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{user.name}</h1>
                  <p className="text-lg text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {user.joinDate}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <Badge className="bg-primary text-primary-foreground">
                    {user.level}
                  </Badge>
                  <Badge variant="outline">{user.totalRooms} Rooms Created</Badge>
                  <Badge variant="outline">{user.coins} Coins</Badge>
                </div>

                <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-center"
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl mx-auto mb-3 flex items-center justify-center`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 bg-white/80 dark:bg-gray-800/80">
            <TabsTrigger value="rooms">My Rooms</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="activity" className="hidden lg:block">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms">
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>My Created Rooms</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRooms.map((room) => (
                    <Card
                      key={room.id}
                      className="border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg mb-3 flex items-center justify-center">
                          <Building className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {room.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {room.created}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            - coins spent
                          </Badge>
                          <div className="flex space-x-1">
                            <Button size="icon" variant="ghost" className="w-6 h-6">
                              <Share2 className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="w-6 h-6">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5" />
                  <span>Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      className={`border ${
                        achievement.earned
                          ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 opacity-60'
                      }`}
                    >
                      <CardContent className="p-4 flex items-center space-x-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            achievement.earned
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <Award
                            className={`w-6 h-6 ${
                              achievement.earned ? 'text-white' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`font-semibold ${
                              achievement.earned
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {achievement.name}
                          </h3>
                          <p
                            className={`text-sm ${
                              achievement.earned
                                ? 'text-gray-600 dark:text-gray-300'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {achievement.description}
                          </p>
                          {achievement.earned && achievement.date && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Earned on {achievement.date}
                            </p>
                          )}
                        </div>
                        {achievement.earned && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            ✓ Earned
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      action: 'Built a new room',
                      item: 'Cozy Bedroom',
                      time: '2 days ago',
                    },
                    {
                      action: 'Earned achievement',
                      item: 'Architect',
                      time: '5 days ago',
                    },
                    {
                      action: 'Shared screenshot',
                      item: 'Living Room',
                      time: '1 week ago',
                    },
                    {
                      action: 'Purchased furniture',
                      item: 'Rainbow Chair',
                      time: '1 week ago',
                    },
                    {
                      action: 'Completed tutorial',
                      item: 'Furniture Placement',
                      time: '2 weeks ago',
                    },
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{activity.action}</span> -{' '}
                          {activity.item}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
