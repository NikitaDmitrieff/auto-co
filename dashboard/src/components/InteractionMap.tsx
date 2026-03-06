'use client';

import { AGENT_ROSTER, LAYER_COLORS } from '@/lib/types';
import type { AgentInteraction, AgentLayer } from '@/lib/types';

interface InteractionMapProps {
  interactions: AgentInteraction[];
}

// Position agents in a circle by layer
const AGENT_POSITIONS: Record<string, { x: number; y: number }> = (() => {
  const agents = Object.keys(AGENT_ROSTER);
  const positions: Record<string, { x: number; y: number }> = {};
  const cx = 300;
  const cy = 250;
  const radius = 180;

  agents.forEach((agent, i) => {
    const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
    positions[agent] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return positions;
})();

export default function InteractionMap({ interactions }: InteractionMapProps) {
  const maxCount = Math.max(...interactions.map(i => i.count), 1);

  // Layer legend
  const layers: AgentLayer[] = ['Strategy', 'Product', 'Engineering', 'Business', 'Intelligence'];

  return (
    <div className="border-3 border-white bg-surface p-4">
      <div className="text-xs text-fg opacity-50 tracking-widest mb-4 flex items-center justify-between">
        <span>AGENT INTERACTION MAP</span>
        <span className="opacity-30">// collaboration frequency</span>
      </div>

      {interactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <svg width="600" height="500" viewBox="0 0 600 500" className="w-full max-w-2xl">
            {/* Grid background */}
            {Array.from({ length: 30 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 20} x2="600" y2={i * 20} stroke="#ffffff08" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 30 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="500" stroke="#ffffff08" strokeWidth="0.5" />
            ))}

            {/* Agent nodes - no connections yet */}
            {Object.entries(AGENT_POSITIONS).map(([agentId, pos]) => {
              const meta = AGENT_ROSTER[agentId];
              const layerColor = LAYER_COLORS[meta.layer];

              return (
                <g key={agentId}>
                  {/* Node border */}
                  <rect
                    x={pos.x - 28}
                    y={pos.y - 12}
                    width="56"
                    height="24"
                    fill="#1a1a1a"
                    stroke={layerColor}
                    strokeWidth="2"
                  />
                  {/* Node label */}
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill={layerColor}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {agentId.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* "No data" text */}
            <text x="300" y="470" textAnchor="middle" fill="#ffffff30" fontSize="10" fontFamily="JetBrains Mono, monospace">
              AWAITING INTERACTION DATA
            </text>
          </svg>

          {/* Layer legend */}
          <div className="flex gap-4 mt-4">
            {layers.map(layer => (
              <div key={layer} className="flex items-center gap-2">
                <div className="w-3 h-3 border" style={{ borderColor: LAYER_COLORS[layer], background: LAYER_COLORS[layer] + '30' }} />
                <span className="text-xs opacity-50">{layer}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg width="600" height="500" viewBox="0 0 600 500" className="w-full max-w-2xl">
            {/* Grid background */}
            {Array.from({ length: 25 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 20} x2="600" y2={i * 20} stroke="#ffffff08" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 30 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="500" stroke="#ffffff08" strokeWidth="0.5" />
            ))}

            {/* Interaction edges */}
            {interactions.map((interaction, idx) => {
              const pos1 = AGENT_POSITIONS[interaction.agent1];
              const pos2 = AGENT_POSITIONS[interaction.agent2];
              if (!pos1 || !pos2) return null;

              const thickness = 1 + (interaction.count / maxCount) * 5;
              const opacity = 0.2 + (interaction.count / maxCount) * 0.6;

              return (
                <line
                  key={idx}
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke="#00FF41"
                  strokeWidth={thickness}
                  opacity={opacity}
                />
              );
            })}

            {/* Agent nodes */}
            {Object.entries(AGENT_POSITIONS).map(([agentId, pos]) => {
              const meta = AGENT_ROSTER[agentId];
              const layerColor = LAYER_COLORS[meta.layer];

              return (
                <g key={agentId}>
                  <rect
                    x={pos.x - 28}
                    y={pos.y - 12}
                    width="56"
                    height="24"
                    fill="#1a1a1a"
                    stroke={layerColor}
                    strokeWidth="2"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill={layerColor}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {agentId.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Layer legend */}
          <div className="flex gap-4 mt-4">
            {layers.map(layer => (
              <div key={layer} className="flex items-center gap-2">
                <div className="w-3 h-3 border" style={{ borderColor: LAYER_COLORS[layer], background: LAYER_COLORS[layer] + '30' }} />
                <span className="text-xs opacity-50">{layer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
