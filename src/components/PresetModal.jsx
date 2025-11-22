import React, { useState, useEffect } from 'react';
import { getPresets, deletePreset } from '../lib/presets';

export default function PresetModal({ mode, onClose, onSave, onLoad }) {
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    if (mode === 'load') {
      setPresets(getPresets());
    }
  }, [mode]);

  const handleSave = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    onSave(presetName.trim());
    onClose();
  };

  const handleLoad = (preset) => {
    onLoad(preset);
    onClose();
  };

  const handleDelete = (id, event) => {
    event.stopPropagation();
    if (confirm('Delete this preset?')) {
      const updated = deletePreset(id);
      setPresets(updated);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'save' ? 'Save Preset' : 'Load Preset'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {mode === 'save' ? (
            <div className="save-form">
              <label htmlFor="preset-name">Preset Name</label>
              <input
                id="preset-name"
                type="text"
                className="preset-input"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., User Authentication Flow"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button className="modal-button primary" onClick={handleSave}>
                Save Preset
              </button>
            </div>
          ) : (
            <div className="preset-list">
              {presets.length === 0 ? (
                <p className="empty-state">No saved presets yet</p>
              ) : (
                presets.map(preset => (
                  <div
                    key={preset.id}
                    className="preset-item"
                    onClick={() => handleLoad(preset)}
                  >
                    <div className="preset-info">
                      <div className="preset-name">{preset.name}</div>
                      <div className="preset-meta">
                        {formatDate(preset.timestamp)} • {preset.data.nodes.length} nodes
                      </div>
                    </div>
                    <button
                      className="preset-delete"
                      onClick={(e) => handleDelete(preset.id, e)}
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
