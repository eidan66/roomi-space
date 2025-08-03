'use client';

import React, { useState } from 'react';

import { ChevronDown, ChevronRight, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Category {
  name: string;
  sub: string[];
}

const CATEGORIES: Category[] = [
  { name: 'Furniture', sub: [] },
  { name: 'Carpets', sub: [] },
  { name: 'Lamps', sub: [] },
  { name: 'Appliances', sub: [] },
  { name: 'Decorative Items', sub: [] },
  {
    name: 'Textures',
    sub: ['Walls', 'Floors', 'Textile'],
  },
];

const ModelCategories: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <Button
              variant="ghost"
              className="w-full flex justify-between"
              onClick={() => setOpen(open === cat.name ? null : cat.name)}
            >
              {cat.name}
              {cat.sub.length > 0 &&
                (open === cat.name ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </Button>
            {open === cat.name && cat.sub.length > 0 && (
              <div className="pl-4 space-y-1">
                {cat.sub.map((s) => (
                  <Button
                    key={s}
                    variant="ghost"
                    className="w-full justify-start text-sm opacity-80"
                    disabled
                  >
                    • {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ModelCategories;
