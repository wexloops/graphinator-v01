import React from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Glow effect */}
      <path
        id={`${id}-glow`}
        style={{
          ...style,
          strokeWidth: 8,
          stroke: 'rgba(102, 170, 153, 0.3)',
          fill: 'none',
          filter: 'blur(4px)',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />

      {/* Main path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path animated-edge"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Animated particle */}
      <circle r="4" fill="#6a9" className="edge-particle">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>

      {/* Label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="edge-label-wrapper"
          >
            <div className="edge-label">{label}</div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
