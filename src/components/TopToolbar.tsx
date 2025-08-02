'use client';

import React from 'react';
import { ROOM_SIZES, RoomSizeKey } from '@/config/roomSizes';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye, Lock, Unlock, Image as ImageIcon, MousePointer2, Hand, Paintbrush2, Trash2, StretchHorizontal as ResizeIcon, Rotate3D } from 'lucide-react';

export type ToolKey = 'select' | 'drag' | 'paint' | 'delete' | 'resize';

export interface TopToolbarProps {
  isPremium: boolean;
  roomSize: RoomSizeKey;
  setRoomSize: (size: RoomSizeKey) => void;
  viewMode: '2d' | '3d';
  setViewMode: (mode: '2d' | '3d') => void;
  activeTool: ToolKey;
  setActiveTool: (tool: ToolKey) => void;
  onScreenshot: () => void;
  onPremiumRedirect: () => void;
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
  onPremiumRedirect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-card border-b border-border px-2 py-2 flex items-center gap-2 sticky top-0 z-40">
      {/* Room Size Selector */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium mr-1 hidden md:inline">{t('toolbar.roomSize')}:</span>
        <select 
          value={roomSize} 
          onChange={(e) => setRoomSize(e.target.value as RoomSizeKey)}
          className="w-[120px] h-8 px-2 py-1 text-sm border border-border rounded bg-background"
        >
          {ROOM_SIZES.map((s) => (
            <option key={s.key} value={s.key}>{t(s.labelKey)}</option>
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
      <Button variant={viewMode === '2d' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('2d')} title={t('toolbar.to2d')}>
        <Eye size={18} />
      </Button>
      <Button variant={viewMode === '3d' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('3d')} title={t('toolbar.to3d')}>
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
      <Button variant={activeTool === 'select' ? 'default' : 'outline'} size="icon" onClick={() => setActiveTool('select')} title={t('tool.select')}>
        <MousePointer2 size={18} />
      </Button>
      <Button variant={activeTool === 'drag' ? 'default' : 'outline'} size="icon" onClick={() => setActiveTool('drag')} title={t('tool.drag')}>
        <Hand size={18} />
      </Button>
      <Button variant={activeTool === 'paint' ? 'default' : 'outline'} size="icon" onClick={() => setActiveTool('paint')} title={t('tool.paint')}>
        <Paintbrush2 size={18} />
      </Button>
      <Button variant={activeTool === 'delete' ? 'default' : 'outline'} size="icon" onClick={() => setActiveTool('delete')} title={t('tool.delete')}>
        <Trash2 size={18} />
      </Button>
      <Button variant={activeTool === 'resize' ? 'default' : 'outline'} size="icon" onClick={() => setActiveTool('resize')} title={t('tool.resize')}>
        <ResizeIcon size={18} />
      </Button>

      <div className="w-px bg-border h-6 mx-2" />

      {/* Screenshot */}
      <Button variant="outline" size="icon" onClick={onScreenshot} title={t('toolbar.screenshot')}>
        <ImageIcon size={18} />
      </Button>
    </div>
  );
};

export default TopToolbar;
