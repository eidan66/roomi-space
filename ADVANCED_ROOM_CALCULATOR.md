# Advanced Room Calculator

A comprehensive room analysis system that provides detailed geometric validation, shape quality metrics, and construction feasibility analysis for room designs.

## Overview

The Advanced Room Calculator replaces the basic area/perimeter calculations with a sophisticated analysis system that evaluates:

- **Geometric Validation**: Ensures walls form a valid closed polygon
- **Shape Quality**: Analyzes compactness, convexity, and regularity
- **Construction Feasibility**: Validates wall lengths and angles for practical construction
- **Space Efficiency**: Calculates usable area and wall-to-floor ratios
- **Detailed Metrics**: Provides comprehensive measurements and analysis

## Key Features

### 1. Comprehensive Validation
- Validates wall connections and topology
- Checks for minimum/maximum wall lengths
- Validates interior angles for construction feasibility
- Detects geometric inconsistencies

### 2. Advanced Shape Metrics
- **Compactness**: How close the shape is to a circle (1.0 = perfect circle)
- **Convexity**: How convex the polygon is (1.0 = fully convex)
- **Rectangularity**: For 4-wall rooms, how close to a perfect rectangle
- **Aspect Ratio**: Width to height ratio of bounding box

### 3. Construction Analysis
- Wall length analysis (shortest, longest, average)
- Interior angle measurements
- Construction feasibility scoring
- Material efficiency calculations

### 4. Space Efficiency
- Usable floor area (accounting for wall thickness)
- Wall-to-floor ratio
- Centroid calculation
- Bounding box analysis

## Usage

### Basic Integration

```typescript
import { AdvancedRoomCalculator, Wall } from '../lib/advanced-room-calculator';

// Define your walls
const walls: Wall[] = [
  { id: '1', start: { x: 0, z: 0 }, end: { x: 6, z: 0 }, height: 3, thickness: 0.2 },
  { id: '2', start: { x: 6, z: 0 }, end: { x: 6, z: 4 }, height: 3, thickness: 0.2 },
  { id: '3', start: { x: 6, z: 4 }, end: { x: 0, z: 4 }, height: 3, thickness: 0.2 },
  { id: '4', start: { x: 0, z: 4 }, end: { x: 0, z: 0 }, height: 3, thickness: 0.2 },
];

// Calculate comprehensive metrics
const metrics = AdvancedRoomCalculator.calculateRoomMetrics(walls);

console.log(`Room area: ${metrics.area.toFixed(2)}m²`);
console.log(`Compactness: ${(metrics.compactness * 100).toFixed(1)}%`);
console.log(`Valid: ${metrics.isValid}`);
```

### Redux Integration

```typescript
// roomSlice.ts
import { AdvancedRoomCalculator, RoomMetrics } from '../lib/advanced-room-calculator';

export interface RoomState {
  walls: Wall[];
  metrics: RoomMetrics;
  // ... other state
}

const recalculateMetrics = (walls: Wall[]): RoomMetrics => {
  return AdvancedRoomCalculator.calculateRoomMetrics(walls);
};

// In your reducers
addWall: (state, action: PayloadAction<Wall>) => {
  state.walls.push(action.payload);
  state.metrics = recalculateMetrics(state.walls);
},
```

### Component Integration

```typescript
// Component usage
import { useSelector } from 'react-redux';
import { AdvancedRoomMetrics } from './AdvancedRoomMetrics';

const RoomBuilder: React.FC = () => {
  const { metrics } = useSelector((state: RootState) => state.room);

  return (
    <div>
      <h2>Room Status: {metrics.isValid ? 'Valid' : 'Invalid'}</h2>
      <p>Area: {metrics.area.toFixed(2)}m²</p>
      <p>Compactness: {(metrics.compactness * 100).toFixed(1)}%</p>
      
      <AdvancedRoomMetrics metrics={metrics} showAdvanced={true} />
    </div>
  );
};
```

## Metrics Explanation

### Basic Measurements
- **Area**: Total floor area in square meters
- **Perimeter**: Total wall length in meters
- **Usable Area**: Floor area minus wall thickness
- **Wall Count**: Number of walls in the room

### Shape Quality Metrics

#### Compactness (0-1)
Measures how close the shape is to a circle. Formula: `(4π × Area) / (Perimeter²)`
- **1.0**: Perfect circle (most efficient)
- **0.8+**: Very compact, efficient shape
- **0.6-0.8**: Good compactness
- **<0.6**: Elongated or irregular shape

#### Convexity (0-1)
Measures how convex the polygon is.
- **1.0**: Fully convex (no indentations)
- **0.8+**: Mostly convex
- **<0.8**: Has concave sections (indentations)

#### Rectangularity (0-1, for 4-wall rooms only)
Measures how close a 4-wall room is to a perfect rectangle.
- **1.0**: Perfect rectangle
- **0.8+**: Very rectangular
- **<0.6**: Irregular quadrilateral

### Construction Metrics

#### Wall Analysis
- **Shortest/Longest Wall**: Identifies extreme wall lengths
- **Average Wall Length**: Mean wall length
- **Wall Length Distribution**: Analysis of wall size consistency

#### Angle Analysis
- **Interior Angles**: All corner angles in degrees
- **Average Angle**: Mean interior angle
- **Angle Validation**: Flags extreme angles (<15° or >345°)

#### Construction Feasibility
- Validates practical construction constraints
- Checks for walls that are too short (<0.1m) or too long (>50m)
- Identifies problematic angles for construction

### Efficiency Metrics

#### Wall-to-Floor Ratio
Percentage of total area occupied by walls.
- **<10%**: Very efficient
- **10-20%**: Good efficiency
- **>20%**: High wall overhead

#### Aspect Ratio
Width to height ratio of the bounding box.
- **1.0**: Square bounding box
- **1.5-2.0**: Good proportions
- **>3.0**: Very elongated

## Validation System

The calculator performs comprehensive validation:

### Geometric Validation
- Ensures walls form a closed polygon
- Validates wall connections (each point connects exactly 2 walls)
- Checks for degenerate cases (zero area, overlapping walls)

### Construction Validation
- Minimum wall length: 0.1m
- Maximum wall length: 50m
- Minimum angle: 15°
- Maximum angle: 345°

### Error Reporting
All validation errors are reported in `metrics.validationErrors[]` with descriptive messages.

## Components

### AdvancedRoomMetrics
Comprehensive metrics display component with:
- Basic measurements (area, perimeter)
- Shape quality indicators with progress bars
- Detailed measurements table
- Wall analysis with length visualization
- Interior angle display
- Validation error reporting

### RoomQualityAnalyzer
Updated quality analyzer using advanced metrics:
- Shape quality scoring
- Regularity analysis
- Size appropriateness
- Construction feasibility
- Space efficiency rating

### IntegratedRoomBuilder
Complete example showing:
- Redux integration
- Real-time metric updates
- Interactive wall management
- Quality visualization
- Error handling

## Migration Guide

### From Basic Calculator

**Old approach:**
```typescript
// Basic calculations
const area = calculateRoomArea(walls);
const perimeter = calculatePerimeter(walls);
const isValid = isValidRoom(walls);
```

**New approach:**
```typescript
// Comprehensive analysis
const metrics = AdvancedRoomCalculator.calculateRoomMetrics(walls);
const { area, perimeter, isValid, compactness, convexity } = metrics;
```

### State Structure Changes

**Old state:**
```typescript
interface RoomState {
  walls: Wall[];
  isValid: boolean;
  area: number;
  perimeter: number;
}
```

**New state:**
```typescript
interface RoomState {
  walls: Wall[];
  metrics: RoomMetrics; // Contains all measurements and validation
}
```

### Component Updates

**Old component:**
```typescript
const { walls, area, perimeter, isValid } = useSelector(state => state.room);
```

**New component:**
```typescript
const { walls, metrics } = useSelector(state => state.room);
const { area, perimeter, isValid, compactness } = metrics;
```

## Performance Considerations

- Calculations are optimized for real-time updates
- Complex polygon operations use efficient algorithms
- Metrics are cached until walls change
- Validation is performed incrementally where possible

## Best Practices

1. **Always check `metrics.isValid`** before using measurements
2. **Display validation errors** to help users fix issues
3. **Use quality metrics** to guide design decisions
4. **Show progress indicators** for quality scores
5. **Provide contextual help** for metric interpretation

## Examples

See the following example components:
- `RoomCalculatorDemo.tsx`: Interactive demo with different room shapes
- `IntegratedRoomBuilder.tsx`: Complete integration example
- `AdvancedRoomMetrics.tsx`: Comprehensive metrics display

## Future Enhancements

Potential future improvements:
- Support for curved walls
- Multi-level room analysis
- Structural load calculations
- Energy efficiency metrics
- Accessibility compliance checking
- Cost estimation integration