'use client';

import { useState, useEffect } from 'react';

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
  walls: Wall[];
  objects: THREE.Object3D[];
  autoSave?: boolean;
  existingDesignId?: string;
}

export default function SaveDesignModal({
  isOpen,
  onClose,
  onSave,
  walls,
  objects,
  autoSave = false,
  existingDesignId,
}: SaveDesignModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !existingDesignId || !user) return;

    const autoSaveInterval = setInterval(async () => {
      if (walls.length === 0) return;

      setAutoSaveStatus('saving');
      try {
        await designService.autoSaveDesign(existingDesignId, {
          userId: user.uid,
          name: name || 'Untitled Design',
          description: description || undefined,
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
        });
        setLastSaved(new Date());
        setAutoSaveStatus('saved');
        
        // Reset status after 2 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (err) {
        setAutoSaveStatus('error');
        console.error('Auto-save failed:', err);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [autoSave, existingDesignId, user, walls, objects, name, description]);

  const handleSave = async () => {
    console.log('🔧 SaveDesignModal handleSave called');
    console.log('🔧 User:', user);
    console.log('🔧 Walls count:', walls.length);
    console.log('🔧 Objects count:', objects.length);
    
    if (!user) {
      console.log('❌ No user found');
      setError('You must be logged in to save designs');
      return;
    }

    if (!name.trim()) {
      console.log('❌ No name provided');
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
      };

      console.log('🔧 Design data prepared:', designData);

      let designId: string;
      if (existingDesignId) {
        console.log('🔧 Updating existing design:', existingDesignId);
        await designService.updateDesign(existingDesignId, designData);
        designId = existingDesignId;
      } else {
        console.log('🔧 Creating new design');
        designId = await designService.saveDesign(designData);
      }

      console.log('🔧 Design saved with ID:', designId);
      setLastSaved(new Date());
      onSave(designId);
      
      if (!autoSave) {
        onClose();
        setName('');
        setDescription('');
      }
    } catch (err) {
      console.error('❌ Save error:', err);
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
          <CardTitle>
            {existingDesignId ? 'Update Design' : 'Save Design'}
          </CardTitle>
          <CardDescription>
            {autoSave && existingDesignId 
              ? 'Design will auto-save every 30 seconds'
              : 'Save your room design to your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Design Name</Label>
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
              disabled={loading}
            />
          </div>

          {autoSave && existingDesignId && (
            <div className="text-sm text-muted-foreground">
              {autoSaveStatus === 'saving' && '🔄 Auto-saving...'}
              {autoSaveStatus === 'saved' && '✅ Auto-saved'}
              {autoSaveStatus === 'error' && '❌ Auto-save failed'}
              {lastSaved && autoSaveStatus === 'idle' && (
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : existingDesignId ? 'Update' : 'Save'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
