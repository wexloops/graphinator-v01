import React from 'react';

const DIAGRAM_TYPES = [
  { id: 'flowchart', label: 'Flow Chart', icon: '→' },
  { id: 'decision', label: 'Decision Tree', icon: '⑂' },
  { id: 'neural', label: 'Neural Diagram', icon: '⚡' }
];

export default function DiagramTypeToggle({ selectedType, onChange }) {
  return (
    <div className="diagram-type-toggle">
      <div className="toggle-label">Diagram Type</div>
      <div className="toggle-buttons">
        {DIAGRAM_TYPES.map(type => (
          <button
            key={type.id}
            className={`toggle-button ${selectedType === type.id ? 'active' : ''}`}
            onClick={() => onChange(type.id)}
            title={type.label}
          >
            <span className="toggle-icon">{type.icon}</span>
            <span className="toggle-text">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
