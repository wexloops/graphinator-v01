import React, { useState } from 'react';
import Header from './components/Header';
import FlowDiagram from './components/FlowDiagram';
import TextBreakdown from './components/TextBreakdown';
import PromptInput from './components/PromptInput';
import DiagramTypeToggle from './components/DiagramTypeToggle';
import { generateFlowchart, updateFlowchart } from './lib/claude';
import { savePreset, loadPreset } from './lib/presets';
import { exportToJSON, importFromJSON, triggerFileUpload } from './lib/fileOperations';
import { autoOrganizeNodes } from './lib/autoLayout';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagramType, setDiagramType] = useState('flowchart');

  const handlePromptSubmit = async (prompt) => {
    setLoading(true);
    setError(null);

    try {
      let result;

      // If we have existing data, treat this as an update
      if (nodes.length > 0) {
        const currentData = { nodes, edges, breakdown };
        result = await updateFlowchart(currentData, prompt, diagramType);
      } else {
        // Otherwise, generate new diagram
        result = await generateFlowchart(prompt, diagramType);
      }

      setNodes(result.nodes);
      setEdges(result.edges);
      setBreakdown(result.breakdown);
    } catch (err) {
      console.error('Error generating diagram:', err);
      setError(err.message || 'Failed to generate diagram');

      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setNodes([]);
    setEdges([]);
    setBreakdown(null);
    setError(null);
  };

  const handleSave = (name) => {
    try {
      savePreset(name, { nodes, edges, breakdown });
      setError(null);
    } catch (err) {
      setError('Failed to save preset');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLoad = (preset) => {
    if (preset && preset.data) {
      setNodes(preset.data.nodes);
      setEdges(preset.data.edges);
      setBreakdown(preset.data.breakdown);
      setError(null);
    }
  };

  const handleExport = () => {
    if (nodes.length === 0) {
      setError('No diagram to export');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      exportToJSON(nodes, edges, breakdown, `graphinator-${timestamp}`);
    } catch (err) {
      setError('Failed to export diagram');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImport = () => {
    triggerFileUpload(async (file) => {
      try {
        const data = await importFromJSON(file);
        setNodes(data.nodes);
        setEdges(data.edges);
        setBreakdown(data.breakdown);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to import diagram');
        setTimeout(() => setError(null), 5000);
      }
    });
  };

  const handleAutoOrganize = () => {
    if (nodes.length === 0) {
      setError('No diagram to organize');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const organizedNodes = autoOrganizeNodes(nodes, edges);
      setNodes(organizedNodes);
    } catch (err) {
      setError('Failed to auto-organize diagram');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="app">
      <Header
        onNew={handleNew}
        onSave={handleSave}
        onLoad={handleLoad}
        onExport={handleExport}
        onImport={handleImport}
        onAutoOrganize={handleAutoOrganize}
        hasData={nodes.length > 0}
      />

      <div className="app-body">
        <TextBreakdown breakdown={breakdown} />

        <div className="main-content">
          <div className="flow-container">
            {loading && (
              <div className="loading-overlay">
                <div className="loading-spinner" />
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <DiagramTypeToggle
              selectedType={diagramType}
              onChange={setDiagramType}
            />

            <FlowDiagram
              nodes={nodes}
              edges={edges}
            />
          </div>

          <PromptInput
            onSubmit={handlePromptSubmit}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
