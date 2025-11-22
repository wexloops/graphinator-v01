# Graphinator

AI-powered flowchart and decision tree generator using Claude.

## Features

### Core Functionality
- **AI-Powered Generation** - Generate flowcharts, decision trees, or neural diagrams from text prompts
- **Three Diagram Types** - Flow Chart, Decision Tree, Neural Diagram modes
- **Natural Language Editing** - Modify existing diagrams through conversational prompts
- **Real-Time Text Breakdown** - Live-synced panel showing overview, steps, decisions, and outcomes

### Interactive Editing
- **Editable Nodes** - Double-click nodes to rename them
- **Color Customization** - Click color button on nodes to change their color (6 color options)
- **Drag & Drop** - Reposition nodes freely
- **Create Connections** - Drag from node handles to create new edges
- **Delete Edges** - Select edges and press Delete key to remove connections
- **Reconnect Nodes** - Delete old edges and create new ones to restructure the flow

### Visual Design
- **Dark Mode UI** - Beautiful dark interface with glass-morphic elements
- **Animated Flow** - Luminous particles flow through edges from start to finish
- **Glow Effects** - Nodes have subtle glowing halos that intensify on hover
- **Smooth Animations** - Transitions, hover states, and interactions are fluid

### Presets & Persistence
- **Save Presets** - Save current flowchart with a custom name to browser storage
- **Load Presets** - Browse and load previously saved flowcharts
- **Export JSON** - Download diagram as JSON file to desktop
- **Import JSON** - Upload JSON files from desktop to restore diagrams
- **New Projects** - Clear current work and start fresh
- **LocalStorage** - Presets stored locally in browser

### Layout & Organization
- **Auto-Organize** - Automatically arrange nodes in hierarchical layout
- **Smart Layout** - BFS-based algorithm positions nodes by levels
- **Manual Override** - Drag nodes freely after auto-organization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your Anthropic API key to `.env`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

4. Start development server:
```bash
npm run dev
```

5. Open http://localhost:3012

## Usage

### Choose Diagram Type
Bottom left toggle lets you select:
- **Flow Chart** - Sequential processes, linear/branching flows
- **Decision Tree** - Hierarchical branching logic with decision points
- **Neural Diagram** - Network-style interconnected nodes with layers

### Generate Diagrams
1. Select diagram type
2. Enter a description (e.g., "Create a user authentication flow")
3. Click Generate
4. View the interactive diagram and text breakdown

### Edit Diagrams
**Modify with AI:**
- Enter changes in prompt (e.g., "Add a payment verification step after login")
- AI updates the existing diagram while preserving structure

**Edit Nodes Directly:**
- **Rename**: Double-click node label, type new name, press Enter
- **Change Color**: Click color dot on node, select from 6 colors
- **Move**: Drag nodes to reposition
- **Delete**: Select node and press Delete key

**Edit Connections:**
- **Create Edge**: Drag from any node handle to another node
- **Delete Edge**: Select edge and press Delete key
- **Reconnect**: Delete old edge and create new one

### Advanced Interactions
- **Zoom**: Use mouse wheel or controls
- **Pan**: Click and drag canvas
- **Multi-Select**: Hold Shift and click multiple items
- **Fit View**: Use controls to reset viewport

### Manage Presets & Files
**Presets (Browser Storage):**
- **New**: Clear current diagram (confirmation if unsaved)
- **Save**: Name and save current diagram to browser
- **Load**: Browse saved presets (shows timestamp and node count)
- **Delete**: Click × on any preset to remove it

**File Operations:**
- **Export**: Download diagram as JSON file (`graphinator-YYYY-MM-DD.json`)
- **Import**: Upload JSON file from desktop to restore diagram
- **Format**: Compatible with Graphinator V01 JSON format

**Auto-Organization:**
- **Auto-Organize**: Click ⚡ button to automatically arrange nodes
- **Hierarchical Layout**: Positions nodes by level using breadth-first traversal
- **Root Detection**: Automatically identifies starting nodes
- **Spacing**: 150px vertical, 250px horizontal between nodes

## Architecture

- **React + Vite** - Fast development and build
- **ReactFlow** - Interactive flowchart rendering
- **Claude API** - AI-powered diagram generation
- **localStorage** - Preset persistence

## Project Structure

```
src/
├── components/
│   ├── Header.jsx              # Top bar with actions and app info
│   ├── FlowDiagram.jsx         # ReactFlow integration with custom nodes/edges
│   ├── CustomNode.jsx          # Editable nodes with color picker
│   ├── AnimatedEdge.jsx        # Edges with animated flow particles
│   ├── DiagramTypeToggle.jsx   # Diagram type selector
│   ├── TextBreakdown.jsx       # Left panel breakdown
│   ├── PromptInput.jsx         # Bottom prompt interface
│   └── PresetModal.jsx         # Save/Load modal
├── lib/
│   ├── claude.js               # Claude API with diagram-type-specific prompts
│   ├── presets.js              # localStorage preset management
│   ├── fileOperations.js       # JSON export/import functionality
│   └── autoLayout.js           # Auto-organize layout algorithm
├── styles/
│   └── index.css               # Dark mode styling with animations
└── App.jsx                     # Main application state and logic
```

## Keyboard Shortcuts

- **Delete** - Delete selected nodes or edges
- **Shift + Click** - Multi-select items
- **Enter** - Confirm node rename
- **Escape** - Cancel node rename
- **Double-Click** - Edit node label
