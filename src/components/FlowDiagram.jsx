import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { InputNode, OutputNode, DefaultNode } from './CustomNode';
import AnimatedEdge from './AnimatedEdge';

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  default: DefaultNode,
};

const edgeTypes = {
  default: AnimatedEdge,
};

export default function FlowDiagram({ nodes: initialNodes, edges: initialEdges, onNodesChange, onEdgesChange }) {
  const [nodes, setNodes, onNodeChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgeChange] = useEdgesState(initialEdges);

  // Update local state when props change
  React.useEffect(() => {
    const nodesWithCallbacks = initialNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onLabelChange: handleLabelChange,
        onColorChange: handleColorChange,
      }
    }));
    setNodes(nodesWithCallbacks);
  }, [initialNodes]);

  React.useEffect(() => {
    const edgesWithType = initialEdges.map(edge => ({
      ...edge,
      type: 'default',
      animated: false,
    }));
    setEdges(edgesWithType);
  }, [initialEdges]);

  // Handle node changes and propagate to parent
  const handleNodesChange = useCallback((changes) => {
    onNodeChange(changes);
    if (onNodesChange) {
      onNodesChange(changes);
    }
  }, [onNodeChange, onNodesChange]);

  // Handle edge changes and propagate to parent
  const handleEdgesChange = useCallback((changes) => {
    onEdgeChange(changes);
    if (onEdgesChange) {
      onEdgesChange(changes);
    }
  }, [onEdgeChange, onEdgesChange]);

  // Handle label changes
  const handleLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newLabel } }
          : node
      )
    );
  }, [setNodes]);

  // Handle color changes
  const handleColorChange = useCallback((nodeId, newColor) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, color: newColor } }
          : node
      )
    );
  }, [setNodes]);

  // Handle new connections
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'default' }, eds)),
    [setEdges]
  );

  // Handle edge deletion with keyboard
  const onEdgesDelete = useCallback(
    (edgesToDelete) => {
      setEdges((eds) => eds.filter((edge) => !edgesToDelete.find((e) => e.id === edge.id)));
    },
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      onEdgesDelete={onEdgesDelete}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      attributionPosition="bottom-right"
      deleteKeyCode="Delete"
      multiSelectionKeyCode="Shift"
    >
      <Controls />
      <MiniMap
        nodeColor={(node) => node.data?.color || '#6a9'}
        style={{
          background: '#0d0d0d',
          border: '1px solid #333',
        }}
      />
      <Background color="#222" gap={16} />
    </ReactFlow>
  );
}
