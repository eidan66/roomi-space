# Dream-Room Studio 🏠✨

A modern, interactive 3D room design and furnishing application built with Next.js, Three.js, and TypeScript. Create, design, and furnish your dream rooms with an intuitive drag-and-drop interface.

## 🚀 Features

### Room Builder (`/builder`)

- **Interactive Wall Drawing**: Click to draw walls with real-time preview
- **Smart Grid System**: Snap-to-grid functionality for precise placement
- **Wall Customization**: Adjust height, thickness, and color
- **Selection Tools**: Select and modify existing walls
- **Undo/Redo System**: Full history management
- **Save/Load Rooms**: Persistent room storage
- **Export Functionality**: Export room designs as JSON
- **Sample Room Generator**: Quick start with pre-built room layouts

### Room Furnishing (`/furnish`)

- **3D Object Placement**: Drag and drop furniture into your room
- **Interactive Controls**: Select, move, rotate, and delete objects
- **Furniture Categories**: Organized by furniture, lighting, and plants
- **Real-time 3D Rendering**: Smooth Three.js-powered visualization
- **Grid Snapping**: Precise object placement
- **Object Properties**: View and modify object details

### Technical Features

- **3D Visualization**: Powered by Three.js with OrbitControls
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Theme switching support
- **Redux State Management**: Centralized state with Redux Toolkit
- **TypeScript**: Full type safety throughout the application
- **Modern UI**: Built with Radix UI components and Tailwind CSS

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd roomi-space
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Usage

### Building a Room

1. Navigate to `/builder`
2. Select the "Wall" tool from the sidebar
3. Click to place the start point of a wall
4. Click again to place the end point
5. Adjust wall properties (height, thickness, color) in the sidebar
6. Use "Select" tool to modify existing walls
7. Save your room when finished

### Furnishing a Room

1. Navigate to `/furnish` (or click "Start Furnishing" from builder)
2. Browse furniture categories in the sidebar
3. Click "Add" to place furniture in your room
4. Click objects in the 3D view to select them
5. Use controls to rotate or delete selected objects
6. Drag objects to move them around the room

## 🏗️ Project Structure

```
src/
├── app/
│   ├── builder/          # Room building interface
│   ├── furnish/          # Room furnishing interface
│   └── ...
├── components/
│   ├── ui/              # Reusable UI components
│   └── ThreeCanvas.tsx  # 3D rendering component
├── features/
│   ├── roomSlice.ts     # Redux room state management
│   └── store.ts         # Redux store configuration
├── types/
│   └── room.ts          # TypeScript type definitions
└── ...
```

## 🎮 Controls

### 3D View Controls

- **Orbit**: Left-click and drag
- **Zoom**: Mouse wheel
- **Pan**: Right-click and drag

### Builder Mode

- **Wall Tool**: Click to start/end wall drawing
- **Select Tool**: Click walls to select and modify them

### Furnish Mode

- **Select Objects**: Click on furniture to select
- **Move Objects**: Drag selected objects
- **Rotate**: Use sidebar controls or keyboard shortcuts

## 🔧 Technical Stack

- **Framework**: Next.js 15.4.2 with App Router
- **3D Graphics**: Three.js with three-stdlib
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Language**: TypeScript
- **Theme**: next-themes for dark/light mode

## 🎨 Customization

### Adding New Furniture

1. Add new furniture types to the store items in `/furnish/page.tsx`
2. Update the `RoomObject` type in `src/types/room.ts`
3. Modify the ThreeCanvas component to render new object types

### Extending Wall Features

1. Update the `Wall` type in `src/types/room.ts`
2. Modify the wall rendering logic in `ThreeCanvas.tsx`
3. Add new controls to the builder sidebar

## 🚀 Deployment

The application can be deployed on any platform that supports Next.js:

### Vercel (Recommended)

```bash
npm run build
# Deploy to Vercel
```

### Other Platforms

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Three.js community for excellent 3D graphics library
- Radix UI for accessible component primitives
- Next.js team for the amazing React framework
- Tailwind CSS for utility-first styling

---

**Dream-Room Studio** - Design your perfect space! 🏠✨
