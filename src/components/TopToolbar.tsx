'use client';

import React from 'react';

import {
  Eye,
  EyeOff,
  Hand,
  Image as ImageIcon,
  Lock,
  MousePointer2,
  Paintbrush2,
  Save,
  StretchHorizontal as ResizeIcon,
  Rotate3D,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { Button } from '@/components/ui/button';
import { ROOM_SIZES, RoomSizeKey } from '@/config/roomSizes';

export type ToolKey = 'select' | 'drag' | 'paint' | 'delete' | 'resize';

export interface TopToolbarProps {
  isPremium: boolean;
  roomSize: RoomSizeKey;
  setRoomSize: (size: RoomSizeKey) => void;
  viewMode: '2d' | '3d';
  setViewMode: (mode: '2d' | '3d') => void;
  activeTool: ToolKey;
  setActiveTool: (tool: ToolKey) => void;
  onScreenshot: (url: string) => void;
  onSave: () => void;
  onPremiumRedirect: () => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  _selectedColor: string;
  _setSelectedColor: (c: string) => void;
  threeCanvasRef?: React.RefObject<HTMLDivElement | null>;
  threeRendererRef?: React.RefObject<THREE.WebGLRenderer | null>;
}

const TopToolbar: React.FC<TopToolbarProps> = ({
  isPremium,
  roomSize,
  setRoomSize,
  viewMode,
  setViewMode,
  activeTool,
  setActiveTool,
  onScreenshot,
  onSave,
  onPremiumRedirect,
  canvasRef,
  threeCanvasRef,
  _selectedColor,
  _setSelectedColor,
  threeRendererRef,
}) => {
  const { t } = useTranslation();

  const captureScreenshot = async () => {
    try {
      let dataURL: string = '';

      if (viewMode === '2d' && canvasRef?.current) {
        // For 2D, try to find and capture canvas directly
        const container = canvasRef.current;
        const canvas = container.querySelector('canvas');
        if (canvas) {
          dataURL = canvas.toDataURL('image/png');
        } else {
          // Fallback: try to capture the container
          try {
            const domtoimage = await import('dom-to-image');
            const blob = await domtoimage.default.toBlob(container);
            dataURL = URL.createObjectURL(blob);
          } catch {
            console.warn('DOM-to-image failed, trying html2canvas');
            const html2canvas = await import('html2canvas');
            const canvas = await html2canvas.default(container);
            dataURL = canvas.toDataURL('image/png');
          }
        }
      } else if (viewMode === '3d') {
        // Try renderer screenshot first
        if (threeRendererRef?.current) {
          const renderer = threeRendererRef.current;
          if (renderer) {
            try {
              if (
                (renderer as THREE.WebGLRenderer & { takeScreenshot?: () => string })
                  .takeScreenshot
              ) {
                dataURL = (
                  renderer as THREE.WebGLRenderer & { takeScreenshot: () => string }
                ).takeScreenshot();
              } else {
                dataURL = renderer.domElement.toDataURL('image/png');
              }
            } catch {
              console.warn(
                'Renderer toDataURL failed, falling back to container capture',
              );
            }
          }
        }
        // If renderer-based capture failed, fall back to container capture
        if (!dataURL && threeCanvasRef?.current) {
          const container = threeCanvasRef.current;

          // Method 1: Try to capture the canvas element directly
          const canvas = container.querySelector('canvas');
          if (canvas) {
            try {
              // Try to get data URL directly
              dataURL = canvas.toDataURL('image/png');
            } catch {
              console.warn('Canvas CORS issue, trying alternative methods');
            }
          }

          // Method 2: If direct capture failed, use html2canvas
          if (!dataURL) {
            try {
              const html2canvas = await import('html2canvas');
              const canvas = await html2canvas.default(container, {
                allowTaint: true,
                useCORS: true,
                logging: false,
                width: container.clientWidth,
                height: container.clientHeight,
              });
              dataURL = canvas.toDataURL('image/png');
            } catch (htmlError) {
              console.warn('html2canvas failed:', htmlError);
            }
          }

          // Method 3: Last resort - use dom-to-image
          if (!dataURL) {
            try {
              const domtoimage = await import('dom-to-image');
              const blob = await domtoimage.default.toBlob(container, {
                quality: 1.0,
                bgcolor: '#ffffff',
                style: {
                  transform: 'scale(1)',
                  'transform-origin': 'top left',
                },
              });
              dataURL = URL.createObjectURL(blob);
            } catch (domError) {
              console.error('All screenshot methods failed:', domError);
              throw new Error('Failed to capture 3D screenshot - all methods failed');
            }
          }
        }
      }

      if (dataURL) {
        // Create download link
        const link = document.createElement('a');
        link.download = `roomi-screenshot-${viewMode}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = dataURL;
        link.click();

        // Show success notification
        onScreenshot(dataURL);
      } else {
        throw new Error('Failed to capture screenshot - no data URL generated');
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      // Show error notification
      onScreenshot('');
    }
  };

  return (
    <div className="w-full bg-card border-b border-border px-2 py-2 flex items-center gap-2 sticky top-0 z-40">
      {/* Room Size Selector */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium mr-1 hidden md:inline">
          {t('toolbar.roomSize')}:
        </span>
        <select
          value={roomSize}
          onChange={(e) => setRoomSize(e.target.value as RoomSizeKey)}
          className="w-[120px] h-8 px-2 py-1 text-sm border border-border rounded bg-background"
        >
          {ROOM_SIZES.map((s) => (
            <option key={s.key} value={s.key}>
              {t(s.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Premium Mode */}
      <Button
        variant="outline"
        size="icon"
        onClick={!isPremium ? onPremiumRedirect : undefined}
        title={isPremium ? t('toolbar.premium') : t('toolbar.premiumMode')}
      >
        {isPremium ? <Unlock size={18} /> : <Lock size={18} />}
      </Button>

      {/* View Mode Switch */}
      <Button
        variant={viewMode === '2d' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setViewMode('2d')}
        title={t('toolbar.to2d')}
      >
        <Eye size={18} />
      </Button>
      <Button
        variant={viewMode === '3d' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setViewMode('3d')}
        title={t('toolbar.to3d')}
      >
        <EyeOff size={18} />
      </Button>

      {/* Camera Rotate (3D only) */}
      {viewMode === '3d' && (
        <Button variant="outline" size="icon" title="Rotate / Pan">
          <Rotate3D size={18} />
        </Button>
      )}

      <div className="w-px bg-border h-6 mx-2" />

      {/* Main Tools */}
      <Button
        variant={activeTool === 'select' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveTool('select')}
        title={t('tool.select')}
      >
        <MousePointer2 size={18} />
      </Button>
      <Button
        variant={activeTool === 'drag' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveTool('drag')}
        title={t('tool.drag')}
      >
        <Hand size={18} />
      </Button>
      <Button
        variant={activeTool === 'paint' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveTool('paint')}
        title={t('tool.paint')}
      >
        <Paintbrush2 size={18} />
      </Button>
      <Button
        variant={activeTool === 'delete' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveTool('delete')}
        title={t('tool.delete')}
      >
        <Trash2 size={18} />
      </Button>
      <Button
        variant={activeTool === 'resize' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveTool('resize')}
        title={t('tool.resize')}
      >
        <ResizeIcon size={18} />
      </Button>

      <div className="w-px bg-border h-6 mx-2" />

      {/* Screenshot */}
      <Button
        variant="outline"
        size="icon"
        onClick={captureScreenshot}
        title={t('toolbar.screenshot')}
      >
        <ImageIcon size={18} />
      </Button>

      {/* Save Design */}
      <Button variant="outline" size="icon" onClick={onSave} title="Save Design">
        <Save size={18} />
      </Button>
    </div>
  );
};

export default TopToolbar;
