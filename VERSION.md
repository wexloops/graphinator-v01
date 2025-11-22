# Graphinator Version History

## V01 - Initial Release
**Released:** November 21, 2025
**Git Tag:** `v01`
**Commit:** `4ea7352`
**Archive:** `graphinator-v01-20251121-215158.tar.gz`

### Features
- **Three Diagram Types**
  - Flow Chart - Sequential processes
  - Decision Tree - Hierarchical branching logic
  - Neural Diagram - Network-style interconnected nodes

- **AI-Powered Generation**
  - Generate diagrams from text prompts
  - Modify existing diagrams through natural language
  - Claude Sonnet 4.5 integration
  - Diagram-type-specific generation rules

- **Interactive Editing**
  - Double-click to rename nodes
  - Click color dot to change node colors (6 options)
  - Drag nodes to reposition
  - Create edges by dragging from handles
  - Delete edges with Delete key
  - Full edge reconnection capability

- **Visual Design**
  - Dark mode glass-morphic UI
  - Animated luminous flow particles
  - Glowing node halos
  - Smooth transitions and animations
  - Custom node styling with blur effects

- **Layout & Organization**
  - Auto-organize button (⚡)
  - BFS-based hierarchical layout algorithm
  - Smart root node detection
  - 150px vertical / 250px horizontal spacing

- **File Management**
  - Export diagrams as JSON to desktop
  - Import JSON files from desktop
  - Defined file format (see FILEFORMAT.md)
  - Date-stamped export filenames

- **Preset System**
  - Save diagrams to browser localStorage
  - Load previously saved diagrams
  - Browse presets with timestamps
  - Delete unwanted presets

- **Text Breakdown Panel**
  - Live-synced process overview
  - Step-by-step descriptions
  - Key decisions highlighted
  - Possible outcomes listed

### Technical Details
- **Framework:** React 18 + Vite 5
- **Diagram Engine:** ReactFlow 11
- **AI Integration:** Claude API (Anthropic SDK)
- **Storage:** Browser localStorage + JSON files
- **Styling:** Custom CSS with animations

### File Structure
```
src/
├── components/
│   ├── Header.jsx              # Top bar with actions
│   ├── FlowDiagram.jsx         # ReactFlow integration
│   ├── CustomNode.jsx          # Editable nodes
│   ├── AnimatedEdge.jsx        # Animated edges
│   ├── DiagramTypeToggle.jsx   # Type selector
│   ├── TextBreakdown.jsx       # Left panel
│   ├── PromptInput.jsx         # Bottom prompt
│   └── PresetModal.jsx         # Save/Load modal
├── lib/
│   ├── claude.js               # AI generation
│   ├── presets.js              # Browser storage
│   ├── fileOperations.js       # JSON export/import
│   └── autoLayout.js           # Layout algorithm
└── styles/
    └── index.css               # Dark mode styling
```

### Known Limitations
- Presets are browser-specific (localStorage)
- No cloud sync or collaboration
- Export format is V01 specific
- Auto-organize uses simple BFS (no advanced graph layouts)

### Future Considerations
This version is stable and locked. Future versions may include:
- Cloud storage integration
- Real-time collaboration
- More layout algorithms
- Additional diagram types
- Theme customization
- Export to image/PDF
- Version control for diagrams
