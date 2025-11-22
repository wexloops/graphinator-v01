import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

const COLORS = ['#6a9', '#9a6', '#a69', '#69a', '#a96', '#96a'];

function EditableNodeContent({ data, id }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(id, label);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLabel(data.label || '');
      setIsEditing(false);
    }
  };

  const handleColorChange = (color) => {
    if (data.onColorChange) {
      data.onColorChange(id, color);
    }
    setShowColorPicker(false);
  };

  return (
    <div className="node-content">
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="node-input"
          autoFocus
        />
      ) : (
        <div className="node-label" onDoubleClick={handleDoubleClick}>
          {data.label}
        </div>
      )}

      <button
        className="node-color-button"
        onClick={(e) => {
          e.stopPropagation();
          setShowColorPicker(!showColorPicker);
        }}
        title="Change color"
      >
        <div className="color-dot" style={{ background: data.color || '#6a9' }}></div>
      </button>

      {showColorPicker && (
        <div className="color-picker">
          {COLORS.map(color => (
            <button
              key={color}
              className="color-option"
              style={{ background: color }}
              onClick={() => handleColorChange(color)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InputNode({ data, id }) {
  const color = data.color || '#6a9';

  return (
    <div className="custom-node input-node" style={{ borderColor: color }}>
      <div className="node-glow" style={{ background: color }}></div>
      <EditableNodeContent data={data} id={id} />
      <Handle type="source" position={Position.Bottom} className="custom-handle" style={{ background: color }} />
    </div>
  );
}

export function OutputNode({ data, id }) {
  const color = data.color || '#a69';

  return (
    <div className="custom-node output-node" style={{ borderColor: color }}>
      <div className="node-glow" style={{ background: color }}></div>
      <EditableNodeContent data={data} id={id} />
      <Handle type="target" position={Position.Top} className="custom-handle" style={{ background: color }} />
    </div>
  );
}

export function DefaultNode({ data, id }) {
  const color = data.color || '#69a';

  return (
    <div className="custom-node default-node" style={{ borderColor: color }}>
      <div className="node-glow" style={{ background: color }}></div>
      <EditableNodeContent data={data} id={id} />
      <Handle type="target" position={Position.Top} className="custom-handle" style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} className="custom-handle" style={{ background: color }} />
    </div>
  );
}
