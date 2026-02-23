import React, { useEffect, useRef, useState, useCallback } from "react";
import { forceStep, initLayout, type LayoutNode, type LayoutEdge } from "./force-layout.js";

export interface VislzrNodeData {
  id: string;
  node_type: string;
  label: string;
  position_x: number;
  position_y: number;
  data: Record<string, unknown> | null;
}

export interface VislzrEdgeData {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  label: string | null;
}

export interface VislzrCanvasProps {
  nodes: VislzrNodeData[];
  edges: VislzrEdgeData[];
  onNodeClick?: (nodeId: string) => void;
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void;
  onAddNode?: () => void;
  onDeleteNode?: (nodeId: string) => void;
}

const NODE_COLORS: Record<string, string> = {
  GOAL: "#7B2FBE",
  HYPOTHESIS: "#00BCD4",
  EVIDENCE: "#10B981",
  NOTE: "#F59E0B",
  TASK: "#EF4444",
  RESOURCE: "#8B5CF6",
};

const EDGE_STYLES: Record<string, { stroke: string; dash?: string; width: number }> = {
  SUPPORTS: { stroke: "#10B981", width: 2 },
  CONTRADICTS: { stroke: "#EF4444", width: 2 },
  DEPENDENCY: { stroke: "#00BCD4", dash: "6,3", width: 1.5 },
  RELATES: { stroke: "rgba(255,255,255,0.2)", dash: "3,3", width: 1 },
  PARENT: { stroke: "#7B2FBE", width: 3 },
};

export function VislzrCanvas({
  nodes,
  edges,
  onNodeClick,
  onNodeDragEnd,
  onAddNode,
  onDeleteNode: _onDeleteNode,
}: VislzrCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, _setPan] = useState({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const iterRef = useRef(0);

  useEffect(() => {
    const ln = initLayout(nodes, 800, 600);
    setLayoutNodes(ln);
    iterRef.current = 0;
  }, [nodes]);

  useEffect(() => {
    if (layoutNodes.length === 0) {
      return;
    }
    const layoutEdges: LayoutEdge[] = edges.map((e) => ({
      source: e.source_node_id,
      target: e.target_node_id,
    }));

    const animate = () => {
      if (iterRef.current < 120) {
        forceStep(layoutNodes, layoutEdges);
        setLayoutNodes([...layoutNodes]);
        iterRef.current++;
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [layoutNodes.length > 0]);

  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = nodeMap.get(nodeId);
      if (!node) {
        return;
      }
      setDragging(nodeId);
      const svg = svgRef.current!;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      setOffset({ x: svgP.x / zoom - pan.x - node.x, y: svgP.y / zoom - pan.y - node.y });
      node.fx = node.x;
      node.fy = node.y;
    },
    [layoutNodes, zoom, pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) {
        return;
      }
      const node = nodeMap.get(dragging);
      if (!node) {
        return;
      }
      const svg = svgRef.current!;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      node.fx = svgP.x / zoom - pan.x - offset.x;
      node.fy = svgP.y / zoom - pan.y - offset.y;
      node.x = node.fx;
      node.y = node.fy;
      setLayoutNodes([...layoutNodes]);
    },
    [dragging, layoutNodes, zoom, pan, offset],
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const node = nodeMap.get(dragging);
      if (node) {
        delete node.fx;
        delete node.fy;
        onNodeDragEnd?.(dragging, node.x, node.y);
      }
      setDragging(null);
    }
  }, [dragging, layoutNodes, onNodeDragEnd]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.2, Math.min(3, z * delta)));
  }, []);

  const nodeData = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0A0A1A",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Toolbar */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: 6 }}>
        {onAddNode && (
          <button
            onClick={onAddNode}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              background: "linear-gradient(135deg, #7B2FBE, #00BCD4)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            + Node
          </button>
        )}
        <button
          onClick={() => setZoom(1)}
          style={{
            padding: "6px 10px",
            fontSize: 12,
            background: "rgba(255,255,255,0.06)",
            color: "#ededed",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Reset Zoom
        </button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: dragging ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
          {/* Edges */}
          {edges.map((edge) => {
            const src = nodeMap.get(edge.source_node_id);
            const tgt = nodeMap.get(edge.target_node_id);
            if (!src || !tgt) {
              return null;
            }
            const style = EDGE_STYLES[edge.edge_type] ?? EDGE_STYLES.RELATES;
            return (
              <line
                key={edge.id}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={style.stroke}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                opacity={0.7}
              />
            );
          })}
          {/* Nodes */}
          {layoutNodes.map((ln) => {
            const nd = nodeData.get(ln.id);
            if (!nd) {
              return null;
            }
            const color = NODE_COLORS[nd.node_type] ?? "#8B5CF6";
            return (
              <g
                key={ln.id}
                transform={`translate(${ln.x}, ${ln.y})`}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => handleMouseDown(e, ln.id)}
                onClick={() => onNodeClick?.(ln.id)}
              >
                <circle r={24} fill={color} opacity={0.15} />
                <circle r={16} fill={color} opacity={0.8} />
                <text
                  y={32}
                  textAnchor="middle"
                  fill="#ededed"
                  fontSize={11}
                  fontFamily="Geist, sans-serif"
                  fontWeight={500}
                >
                  {nd.label.length > 18 ? nd.label.slice(0, 16) + "..." : nd.label}
                </text>
                <text
                  y={-24}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize={9}
                  fontFamily="Geist, sans-serif"
                  fontWeight={600}
                  letterSpacing="0.05em"
                >
                  {nd.node_type}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
