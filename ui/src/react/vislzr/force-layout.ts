export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

const REPULSION = 5000;
const ATTRACTION = 0.005;
const DAMPING = 0.85;
const MIN_DISTANCE = 50;

export function forceStep(nodes: LayoutNode[], edges: LayoutEdge[]): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Repulsion between all node pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_DISTANCE) {
        dist = MIN_DISTANCE;
      }
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // Attraction along edges
  for (const edge of edges) {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b) {
      continue;
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = dist * ATTRACTION;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Apply velocities
  for (const node of nodes) {
    if (node.fx !== undefined) {
      node.x = node.fx;
      node.vx = 0;
    } else {
      node.vx *= DAMPING;
      node.x += node.vx;
    }
    if (node.fy !== undefined) {
      node.y = node.fy;
      node.vy = 0;
    } else {
      node.vy *= DAMPING;
      node.y += node.vy;
    }
  }
}

export function initLayout(
  nodes: { id: string; position_x: number; position_y: number }[],
  width: number,
  height: number,
): LayoutNode[] {
  return nodes.map((n) => ({
    id: n.id,
    x: n.position_x || Math.random() * width,
    y: n.position_y || Math.random() * height,
    vx: 0,
    vy: 0,
  }));
}
