import { BaseEdge, Position, getBezierPath, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react';

/** Point where the line between two node centers leaves the source node's rectangle. */
function borderPoint(a: InternalNode, b: InternalNode): { x: number; y: number } {
  const w = (a.measured.width ?? 0) / 2;
  const h = (a.measured.height ?? 0) / 2;
  const ax = a.internals.positionAbsolute.x + w;
  const ay = a.internals.positionAbsolute.y + h;
  const bx = b.internals.positionAbsolute.x + (b.measured.width ?? 0) / 2;
  const by = b.internals.positionAbsolute.y + (b.measured.height ?? 0) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  if (!dx && !dy) return { x: ax, y: ay };
  const s = Math.min(w / Math.abs(dx || 1e-9), h / Math.abs(dy || 1e-9));
  return { x: ax + dx * s, y: ay + dy * s };
}

function sideOf(n: InternalNode, p: { x: number; y: number }): Position {
  const { x, y } = n.internals.positionAbsolute;
  const w = n.measured.width ?? 0;
  const h = n.measured.height ?? 0;
  if (p.x <= x + 1) return Position.Left;
  if (p.x >= x + w - 1) return Position.Right;
  if (p.y <= y + 1) return Position.Top;
  return h ? Position.Bottom : Position.Right;
}

/** Edges that leave and enter whichever side faces the other node: clean for maps with no main direction. */
export function FloatingEdge({ id, source, target, markerEnd, style, label, labelStyle, labelBgStyle, labelBgPadding, labelBgBorderRadius }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const sp = borderPoint(s, t);
  const tp = borderPoint(t, s);
  const [path, labelX, labelY] = getBezierPath({
    sourceX: sp.x,
    sourceY: sp.y,
    sourcePosition: sideOf(s, sp),
    targetX: tp.x,
    targetY: tp.y,
    targetPosition: sideOf(t, tp),
    curvature: 0.18,
  });
  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  );
}
