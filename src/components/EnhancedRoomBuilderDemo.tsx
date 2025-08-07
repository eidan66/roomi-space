'use client';

import React from 'react';

import { Provider } from 'react-redux';

import EnhancedRoomBuilderPage from '@/app/builder/enhanced-page';
import { store } from '@/features/store';

/**
 * Demo component to showcase the enhanced room building system
 * This demonstrates all the key features:
 * - Manual room closing (only when clicking first point)
 * - Multiple room creation including nested rooms
 * - Dynamic wall thickness (10cm inside, 25cm outside)
 * - Enhanced floor rendering for complex shapes
 * - Real-time geometry updates
 */
export const EnhancedRoomBuilderDemo: React.FC = () => (
  <Provider store={store}>
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg mb-8 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Room Drawing System
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Manual Closing</h3>
              <p className="text-sm text-blue-700">
                Rooms only close when you click the first point - no accidental closures!
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Multiple Rooms</h3>
              <p className="text-sm text-green-700">
                Create unlimited rooms including nested ones (bedrooms inside houses).
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Smart Thickness</h3>
              <p className="text-sm text-purple-700">
                Inside walls: 10cm, Outside walls: 25cm - automatically detected!
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Complex Floors</h3>
              <p className="text-sm text-orange-700">
                Advanced rendering handles irregular shapes and nested rooms perfectly.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">How to Use:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <strong>Drawing:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Click "Draw" to start a new room</li>
                  <li>Click points to create walls</li>
                  <li>First point shows as red circle</li>
                  <li>Click red circle to close room</li>
                </ul>
              </div>
              <div>
                <strong>Controls:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>ESC: Cancel current room</li>
                  <li>Enter: Complete room</li>
                  <li>Ctrl+N: Start new room</li>
                  <li>Wheel: Zoom, Drag: Pan</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* The actual enhanced room builder */}
        <EnhancedRoomBuilderPage />
      </div>
    </div>
  </Provider>
);

export default EnhancedRoomBuilderDemo;
