'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit, Eye, Download } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { designService, SavedDesign } from '@/lib/designService';

interface DesignGalleryProps {
  onLoadDesign: (design: SavedDesign) => void;
  onEditDesign: (designId: string) => void;
}

export default function DesignGallery({ onLoadDesign, onEditDesign }: DesignGalleryProps) {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDesigns([]);
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = designService.subscribeToUserDesigns(user.uid, (updatedDesigns) => {
      setDesigns(updatedDesigns);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await designService.deleteDesign(designId);
      // Real-time listener will automatically update the list
    } catch (err) {
      setError('Failed to delete design');
      console.error('Delete error:', err);
    }
  };

  const handleExportDesign = (design: SavedDesign) => {
    const dataStr = JSON.stringify(design, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${design.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Designs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to view your designs</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Designs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading your designs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Designs</h2>
        <div className="text-sm text-muted-foreground">
          {designs.length} design{designs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {designs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No designs yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first room design to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <Card key={design.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{design.name}</CardTitle>
                    {design.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {design.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground mb-3">
                  <div>Walls: {design.walls.length}</div>
                  <div>Objects: {design.objects.length}</div>
                  
                  <div>Updated: {design.updatedAt.toLocaleDateString()}</div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLoadDesign(design)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditDesign(design.id!)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportDesign(design)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteDesign(design.id!)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 