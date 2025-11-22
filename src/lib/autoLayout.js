/**
 * Auto-organize nodes using a simple hierarchical layout
 */
export function autoOrganizeNodes(nodes, edges) {
  // Find root nodes (nodes with no incoming edges)
  const nodeIds = new Set(nodes.map(n => n.id));
  const targetIds = new Set(edges.map(e => e.target));
  const rootIds = [...nodeIds].filter(id => !targetIds.has(id));

  // If no roots found, use first node
  if (rootIds.length === 0 && nodes.length > 0) {
    rootIds.push(nodes[0].id);
  }

  // Build adjacency list
  const adjacency = {};
  nodes.forEach(node => {
    adjacency[node.id] = [];
  });
  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  });

  // Calculate levels using BFS
  const levels = {};
  const visited = new Set();
  const queue = rootIds.map(id => ({ id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift();

    if (visited.has(id)) continue;
    visited.add(id);

    levels[id] = level;

    (adjacency[id] || []).forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Handle disconnected nodes
  nodes.forEach(node => {
    if (levels[node.id] === undefined) {
      levels[node.id] = 0;
    }
  });

  // Group nodes by level
  const nodesByLevel = {};
  nodes.forEach(node => {
    const level = levels[node.id];
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node);
  });

  // Layout parameters
  const VERTICAL_SPACING = 150;
  const HORIZONTAL_SPACING = 250;
  const START_X = 100;
  const START_Y = 50;

  // Position nodes
  const organizedNodes = nodes.map(node => {
    const level = levels[node.id];
    const nodesInLevel = nodesByLevel[level];
    const indexInLevel = nodesInLevel.indexOf(node);
    const totalInLevel = nodesInLevel.length;

    // Center nodes horizontally at each level
    const levelWidth = (totalInLevel - 1) * HORIZONTAL_SPACING;
    const startX = START_X - levelWidth / 2;

    return {
      ...node,
      position: {
        x: startX + indexInLevel * HORIZONTAL_SPACING + (level * 50), // Slight offset per level
        y: START_Y + level * VERTICAL_SPACING
      }
    };
  });

  return organizedNodes;
}
