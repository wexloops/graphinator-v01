import React, { useState } from 'react';
import PresetModal from './PresetModal';

export default function Header({
  onNew,
  onSave,
  onLoad,
  onExport,
  onImport,
  onAutoOrganize,
  hasData
}) {
  const [showModal, setShowModal] = useState(null);

  const handleNew = () => {
    if (hasData && !confirm('Clear current flowchart? Unsaved changes will be lost.')) {
      return;
    }
    onNew();
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Graphinator V01</h1>
        </div>

        <div className="header-center">
          <button
            className="header-button"
            onClick={handleNew}
            title="New diagram"
          >
            <span className="button-icon">+</span>
            New
          </button>

          <button
            className="header-button"
            onClick={() => setShowModal('save')}
            disabled={!hasData}
            title="Save to presets"
          >
            <span className="button-icon">💾</span>
            Save
          </button>

          <button
            className="header-button"
            onClick={() => setShowModal('load')}
            title="Load from presets"
          >
            <span className="button-icon">📂</span>
            Load
          </button>

          <div className="header-divider"></div>

          <button
            className="header-button"
            onClick={onExport}
            disabled={!hasData}
            title="Export as JSON file"
          >
            <span className="button-icon">⬇</span>
            Export
          </button>

          <button
            className="header-button"
            onClick={onImport}
            title="Import JSON file"
          >
            <span className="button-icon">⬆</span>
            Import
          </button>

          <div className="header-divider"></div>

          <button
            className="header-button organize-button"
            onClick={onAutoOrganize}
            disabled={!hasData}
            title="Auto-organize layout"
          >
            <span className="button-icon">⚡</span>
            Auto-Organize
          </button>
        </div>

        <div className="header-right">
          <div className="app-info">
            <span className="app-status">Claude AI</span>
          </div>
        </div>
      </header>

      {showModal && (
        <PresetModal
          mode={showModal}
          onClose={() => setShowModal(null)}
          onSave={onSave}
          onLoad={onLoad}
        />
      )}
    </>
  );
}
