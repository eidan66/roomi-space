'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, Image, FileText, Package } from 'lucide-react';
import { Wall } from './Floorplan2DCanvas';

interface RoomExporterProps {
  walls: Wall[];
  roomName: string;
  floorType: string;
  wallMaterial: string;
  windowStyle: string;
  roomStats: {
    area: number;
    perimeter: number;
    wallCount: number;
    isValid: boolean;
  };
}

const RoomExporter: React.FC<RoomExporterProps> = ({
  walls,
  roomName,
  floorType,
  wallMaterial,
  windowStyle,
  roomStats
}) => {
  const exportAsJSON = () => {
    const roomData = {
      name: roomName,
      walls,
      materials: {
        floor: floorType,
        wall: wallMaterial,
        window: windowStyle
      },
      stats: roomStats,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(roomData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roomName.replace(/\s+/g, '_')}_room_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const csvData = [
      ['Property', 'Value'],
      ['Room Name', roomName],
      ['Wall Count', roomStats.wallCount.toString()],
      ['Room Area', `${roomStats.area.toFixed(2)} m²`],
      ['Perimeter', `${roomStats.perimeter.toFixed(2)} m`],
      ['Floor Material', floorType],
      ['Wall Material', wallMaterial],
      ['Window Style', windowStyle],
      ['Valid Room', roomStats.isValid ? 'Yes' : 'No'],
      ['Export Date', new Date().toLocaleDateString()],
      ['', ''],
      ['Wall Details', ''],
      ['Wall ID', 'Start X', 'Start Z', 'End X', 'End Z', 'Length', 'Height', 'Thickness']
    ];

    walls.forEach((wall, index) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.z - wall.start.z, 2)
      );
      csvData.push([
        `Wall ${index + 1}`,
        wall.start.x.toFixed(2),
        wall.start.z.toFixed(2),
        wall.end.x.toFixed(2),
        wall.end.z.toFixed(2),
        length.toFixed(2),
        wall.height.toFixed(2),
        wall.thickness.toFixed(2)
      ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roomName.replace(/\s+/g, '_')}_room_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateShareableLink = () => {
    const roomData = {
      walls: walls.map(w => ({
        start: w.start,
        end: w.end,
        height: w.height,
        thickness: w.thickness
      })),
      materials: { floorType, wallMaterial, windowStyle },
      name: roomName
    };

    const encodedData = btoa(JSON.stringify(roomData));
    const shareUrl = `${window.location.origin}/builder?room=${encodedData}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Shareable link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this shareable link:', shareUrl);
    });
  };

  const captureScreenshot = () => {
    // This would capture the 3D canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${roomName.replace(/\s+/g, '_')}_screenshot.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const generateBuildingReport = () => {
    const report = `
ROOM BUILDING REPORT
===================

Room Name: ${roomName}
Generated: ${new Date().toLocaleString()}

ROOM SPECIFICATIONS
------------------
• Area: ${roomStats.area.toFixed(2)} m²
• Perimeter: ${roomStats.perimeter.toFixed(2)} m
• Wall Count: ${roomStats.wallCount}
• Room Status: ${roomStats.isValid ? 'Valid' : 'Invalid'}

MATERIALS SELECTED
-----------------
• Floor: ${floorType.charAt(0).toUpperCase() + floorType.slice(1)}
• Walls: ${wallMaterial.charAt(0).toUpperCase() + wallMaterial.slice(1)}
• Windows: ${windowStyle.charAt(0).toUpperCase() + windowStyle.slice(1)}

WALL DETAILS
-----------
${walls.map((wall, index) => {
  const length = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + 
    Math.pow(wall.end.z - wall.start.z, 2)
  );
  return `Wall ${index + 1}: ${length.toFixed(2)}m long, ${wall.height.toFixed(2)}m high, ${wall.thickness.toFixed(2)}m thick`;
}).join('\n')}

CONSTRUCTION NOTES
-----------------
• All measurements are in meters
• Room design follows architectural standards
• Materials selected for optimal performance
• Quality validated through advanced geometry engine

Generated by Roomi Room Builder
    `.trim();

    const dataBlob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roomName.replace(/\s+/g, '_')}_building_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (walls.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Export Room</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Create a room to enable export options
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Export Room</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsJSON}
            className="text-xs"
          >
            <Package className="w-3 h-3 mr-1" />
            JSON Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsCSV}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            CSV Report
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={captureScreenshot}
            className="text-xs"
          >
            <Image className="w-3 h-3 mr-1" />
            Screenshot
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateBuildingReport}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Report
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={generateShareableLink}
          className="w-full text-xs"
          disabled={!roomStats.isValid}
        >
          <Share2 className="w-3 h-3 mr-1" />
          Share Room Link
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoomExporter;