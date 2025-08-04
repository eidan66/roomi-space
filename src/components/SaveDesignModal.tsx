'use client';

import { useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { designService } from '@/lib/designService';

interface SaveDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (designId: string) => void;
  walls: any[];
  objects: any[];
  roomMetrics?: any;
}

export default function SaveDesignModal({
  isOpen,
  onClose,
  onSave,
  walls,
  objects,
  roomMetrics,
}: SaveDesignModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save designs');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a design name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const designData = {
        userId: user.uid,
        name: name.trim(),
        description: description.trim() || undefined,
        walls: walls.map((wall) => ({
          id: wall.id,
          start: wall.start,
          end: wall.end,
          height: wall.height,
          thickness: wall.thickness,
        })),
        objects: objects.map((obj) => ({
          id: obj.id || obj.uuid,
          type: obj.userData?.type || 'unknown',
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          userData: obj.userData,
        })),
        roomMetrics,
      };

      const designId = await designService.saveDesign(designData);
      onSave(designId);
      onClose();
      setName('');
      setDescription('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save design';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Save Design</CardTitle>
          <CardDescription>Save your current room design to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Design Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter design name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your design..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>This design includes:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{walls.length} walls</li>
              <li>{objects.length} objects</li>
              {roomMetrics && <li>Room area: {roomMetrics.area?.toFixed(2)} m²</li>}
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Design'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
