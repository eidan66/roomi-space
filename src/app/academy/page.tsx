'use client';

import React, { useState } from 'react';

import {
  Award,
  BookOpen,
  Building,
  Clock,
  FileText,
  GraduationCap,
  Palette,
  Play,
  Share2,
  Star,
  Users,
  Video,
} from 'lucide-react';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AcademyPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const tutorials = [
    {
      id: 1,
      title: 'Your First Room',
      description: 'Learn the basics of drawing walls and creating your first 3D room',
      difficulty: 'beginner',
      duration: '5 min',
      category: 'building',
      type: 'video',
      completed: false,
      rating: 4.9,
      students: 1200,
    },
    {
      id: 2,
      title: 'Wall Techniques',
      description: 'Master advanced wall drawing techniques, doors, and windows',
      difficulty: 'intermediate',
      duration: '8 min',
      category: 'building',
      type: 'interactive',
      completed: false,
      rating: 4.8,
      students: 850,
    },
    {
      id: 3,
      title: 'Furniture Placement',
      description: 'Discover how to arrange furniture and create cozy spaces',
      difficulty: 'beginner',
      duration: '6 min',
      category: 'design',
      type: 'video',
      completed: true,
      rating: 4.9,
      students: 950,
    },
    {
      id: 4,
      title: 'Color & Lighting',
      description: 'Learn about color theory and lighting to make rooms beautiful',
      difficulty: 'intermediate',
      duration: '10 min',
      category: 'design',
      type: 'article',
      completed: false,
      rating: 4.7,
      students: 600,
    },
    {
      id: 5,
      title: 'Sharing Your Creations',
      description: 'How to take amazing screenshots and share with friends',
      difficulty: 'beginner',
      duration: '4 min',
      category: 'sharing',
      type: 'video',
      completed: false,
      rating: 4.8,
      students: 700,
    },
    {
      id: 6,
      title: 'Advanced Building',
      description: 'Create complex multi-room layouts and architectural details',
      difficulty: 'advanced',
      duration: '15 min',
      category: 'building',
      type: 'interactive',
      completed: false,
      rating: 4.6,
      students: 300,
    },
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: BookOpen },
    { id: 'building', name: 'Building', icon: Building },
    { id: 'design', name: 'Design', icon: Palette },
    { id: 'sharing', name: 'Sharing', icon: Share2 },
  ];

  const difficulties = [
    { id: 'all', name: 'All Levels', color: 'bg-gray-100 text-gray-700' },
    {
      id: 'beginner',
      name: 'Beginner',
      color: 'bg-green-100 text-green-700',
    },
    {
      id: 'intermediate',
      name: 'Intermediate',
      color: 'bg-yellow-100 text-yellow-700',
    },
    { id: 'advanced', name: 'Advanced', color: 'bg-red-100 text-red-700' },
  ];

  const filteredTutorials = tutorials.filter(
    (tutorial) =>
      selectedDifficulty === 'all' || tutorial.difficulty === selectedDifficulty,
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'interactive':
        return Play;
      case 'article':
        return FileText;
      default:
        return BookOpen;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-white/90">
              <Image
                src="/images/roomi-logo-light.jpeg"
                alt="ROOMI Space Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              ROOMI Academy
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master the art of 3D room building with our interactive tutorials and guides
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tutorials', value: '20+', icon: BookOpen },
            { label: 'Students', value: '5K+', icon: Users },
            { label: 'Completed', value: '15K+', icon: Award },
            { label: 'Avg. Rating', value: '4.8', icon: Star },
          ].map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-center"
            >
              <CardContent className="p-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-white" />
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

        <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                  Browse by Topic
                </h3>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className="text-sm"
                      >
                        <category.icon className="w-4 h-4 mr-1" />
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                  Difficulty Level
                </h3>
                <div className="flex flex-wrap gap-2">
                  {difficulties.map((difficulty) => (
                    <Button
                      key={difficulty.id}
                      variant={
                        selectedDifficulty === difficulty.id ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setSelectedDifficulty(difficulty.id)}
                      className="text-xs"
                    >
                      {difficulty.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((tutorial) => {
            const TypeIcon = getTypeIcon(tutorial.type);
            return (
              <Card
                key={tutorial.id}
                className="group hover:shadow-xl transition-all duration-300 border-0 bg-card/90 backdrop-blur-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <TypeIcon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {tutorial.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getDifficultyColor(tutorial.difficulty)}>
                            {tutorial.difficulty}
                          </Badge>
                          {tutorial.completed && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              ✓ Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {tutorial.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {tutorial.duration}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {tutorial.students}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span>{tutorial.rating}</span>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Play className="w-4 h-4 mr-2" />
                    {tutorial.completed ? 'Review' : 'Start Tutorial'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Recommended Learning Path
          </h2>
          <Card className="border-0 shadow-lg bg-card/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-8">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Complete Beginner Course
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Follow our structured 6-lesson course to become a room building expert
                  </p>
                  <div className="flex items-center justify-center md:justify-start space-x-4 text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      30 minutes total
                    </span>
                    <span className="flex items-center text-muted-foreground">
                      <Award className="w-4 h-4 mr-1" />
                      Certificate included
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
                >
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Start Learning Path
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
