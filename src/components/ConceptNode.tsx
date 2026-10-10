import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GNode } from '../shared/schema';

export type ConceptData = { node: GNode; hue: string; dim: boolean; vertical: boolean };
export type ConceptFlowNode = Node<ConceptData, 'concept'>;

const ROLE_MARK: Partial<Record<GNode['role'], string>> = {
  decision: '◆',
  question: '?',
  outcome: '●',
  person: '◉',
  place: '⌖',
  event: '◷',
  example: '◇',
  source: '❝',
  process: '▸',
};

function ConceptNodeView({ data, selected }: NodeProps<ConceptFlowNode>) {
  const { node, hue, dim, vertical } = data;
  const core = node.role === 'core';
  return (
    <div
      className={`gnode role-${node.role}${core ? ' core' : ''}${selected ? ' selected' : ''}${dim ? ' dim' : ''}`}
      style={{ ['--hue' as string]: hue }}
      title={node.detail}
    >
      <Handle type="target" position={vertical ? Position.Top : Position.Left} className="gh" isConnectable />
      <span className="gnode-mark" aria-hidden>
        {ROLE_MARK[node.role] ?? ''}
      </span>
      <span className="gnode-label">{node.label}</span>
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} className="gh" isConnectable />
    </div>
  );
}

export const ConceptNode = memo(ConceptNodeView);
