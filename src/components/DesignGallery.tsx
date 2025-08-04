'use client';

import { useEffect, useState } from 'react';

import { Search } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SavedDesign, designService } from '@/lib/designService';

interface DesignGalleryProps {
  onLoadDesign: (design: SavedDesign) => void;
  onEditDesign: (designId: string) => void;
}

export default function DesignGallery({
  onLoadDesign,
  onEditDesign,
}: DesignGalleryProps) {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexError, setIndexError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy] = useState<'date' | 'name'>('date');

  useEffect(() => {
    if (!user) {
      setDesigns([]);
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = designService.subscribeToUserDesigns(
      user.uid,
      (updatedDesigns) => {
        setDesigns(updatedDesigns);
        setFilteredDesigns(updatedDesigns);
        setLoading(false);
        setIndexError(false);
      },
    );

    // Check for index errors in console
    const originalError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.includes?.('Firestore index error') ||
        args[0]?.includes?.('failed-precondition')
      ) {
        setIndexError(true);
        setError('Firebase index not configured. Please contact support.');
      }
      originalError.apply(console, args);
    };

    return () => {
      unsubscribe();
      console.error = originalError;
    };
  }, [user]);

  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await designService.deleteDesign(designId);
      // Real-time listener will automatically update the list
    } catch (err) {
      setError('Failed to delete design');
      console.error('Delete error:', err);
    }
  };

  const _handleExportDesign = (design: SavedDesign) => {
    const dataStr = JSON.stringify(design, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${design.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort designs
  useEffect(() => {
    const filtered = designs.filter(
      (design) =>
        design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        design.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Sort designs
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return (
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
      }
      return a.name.localeCompare(b.name);
    });

    setFilteredDesigns(filtered);
  }, [designs, searchTerm, sortBy]);

  const formatDate = (date: Date | undefined) => {
    if (!date) {
      return 'Unknown';
    }
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    }
    if (diffDays === 2) {
      return 'Yesterday';
    }
    if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    }
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Designs</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please sign in to view your designs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="h-10 bg-muted rounded animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="flex gap-4">
                      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Designs</h2>
        <span className="text-sm text-muted-foreground">
          {filteredDesigns.length} design{filteredDesigns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Simple Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Find a design..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">{error}</p>
                {indexError && (
                  <p className="text-xs text-red-600 mt-1">
                    Database setup required. Contact support.
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  const unsubscribe = designService.subscribeToUserDesigns(
                    user!.uid,
                    (updatedDesigns) => {
                      setDesigns(updatedDesigns);
                      setFilteredDesigns(updatedDesigns);
                      setLoading(false);
                      setIndexError(false);
                    },
                  );
                  return unsubscribe;
                }}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredDesigns.length === 0 && !loading && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'No designs found' : 'No designs yet'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-muted-foreground mt-1">
                Create your first room design to get started
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDesigns.map((design) => (
            <Card
              key={design.id}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onLoadDesign(design)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {design.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{design.walls.length} walls</span>
                      <span>{design.objects.length} objects</span>
                      <span>{formatDate(design.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditDesign(design.id!);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDesign(design.id!);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
