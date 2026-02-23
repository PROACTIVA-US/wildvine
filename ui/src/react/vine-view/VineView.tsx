import React, { useMemo } from "react";

export interface VineNode {
  id: string;
  label: string;
  type: "root" | "branch" | "leaf";
  status: "healthy" | "warning" | "error" | "unknown";
  children?: VineNode[];
}

export interface VineViewProps {
  data: VineNode;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  unknown: "rgba(255,255,255,0.3)",
};

function flattenTree(
  node: VineNode,
  x: number,
  y: number,
  level: number,
  spacing: { x: number; y: number },
): {
  nodes: { id: string; label: string; status: string; x: number; y: number; type: string }[];
  edges: { from: string; to: string }[];
} {
  const nodes: { id: string; label: string; status: string; x: number; y: number; type: string }[] =
    [];
  const edges: { from: string; to: string }[] = [];
  nodes.push({ id: node.id, label: node.label, status: node.status, x, y, type: node.type });

  const children = node.children ?? [];
  const totalHeight = (children.length - 1) * spacing.y;
  let startY = y - totalHeight / 2;

  for (const child of children) {
    const childX = x + spacing.x;
    const childY = startY;
    edges.push({ from: node.id, to: child.id });
    const sub = flattenTree(child, childX, childY, level + 1, spacing);
    nodes.push(...sub.nodes);
    edges.push(...sub.edges);
    startY += spacing.y;
  }

  return { nodes, edges };
}

export function VineView({ data }: VineViewProps) {
  const { nodes, edges } = useMemo(() => flattenTree(data, 100, 300, 0, { x: 200, y: 60 }), [data]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const maxX = Math.max(...nodes.map((n) => n.x)) + 150;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 60;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0A0A1A",
        borderRadius: 12,
        overflow: "auto",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <svg width={Math.max(maxX, 800)} height={Math.max(maxY, 600)} style={{ display: "block" }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeMap.get(e.from);
          const to = nodeMap.get(e.to);
          if (!from || !to) {
            return null;
          }
          const midX = (from.x + to.x) / 2;
          return (
            <path
              key={i}
              d={`M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={2}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n) => {
          const color = STATUS_COLORS[n.status] ?? STATUS_COLORS.unknown;
          const radius = n.type === "root" ? 20 : n.type === "branch" ? 14 : 10;
          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              {/* Glow */}
              <circle r={radius + 8} fill={color} opacity={0.1}>
                {n.status === "healthy" && (
                  <animate
                    attributeName="opacity"
                    values="0.05;0.15;0.05"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <circle r={radius} fill={color} opacity={0.85} />
              <text
                x={radius + 10}
                y={4}
                fill="#ededed"
                fontSize={12}
                fontFamily="Geist, sans-serif"
                fontWeight={500}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
