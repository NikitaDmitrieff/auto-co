import fs from 'fs';
import path from 'path';
import type { CycleLog, CompanyPhase, MetricsData, AgentInteraction } from './types';

const AUTO_CO_ROOT = path.resolve(process.cwd(), '..');
const LOGS_DIR = path.join(AUTO_CO_ROOT, 'logs');

function parseLogFile(filePath: string, fileName: string): CycleLog | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Try to extract cycle number from filename (e.g., cycle-001.md, 001.log, etc.)
    const cycleMatch = fileName.match(/(\d+)/);
    const cycleNumber = cycleMatch ? parseInt(cycleMatch[1], 10) : 0;

    // Try to extract phase
    const phaseMatch = content.match(/phase:\s*(\w+)/i);
    const phase: CompanyPhase = phaseMatch
      ? (phaseMatch[1].toLowerCase() as CompanyPhase)
      : 'day0';

    // Try to extract agents
    const agentMatches = content.match(/agents?:\s*\[?([^\]\n]+)/i);
    const agents = agentMatches
      ? agentMatches[1].split(/[,\s]+/).filter(a => a.trim())
      : [];

    // Extract summary (first paragraph or heading after metadata)
    const lines = content.split('\n').filter(l => l.trim());
    const summary = lines.find(l => !l.startsWith('#') && !l.match(/^\w+:/)) || lines[0] || '';

    // Detect success/failure
    const success = !content.toLowerCase().includes('failed') && !content.toLowerCase().includes('error');

    // Extract artifact references
    const artifactMatches = content.match(/docs\/\S+|projects\/\S+/g) || [];

    const stat = fs.statSync(filePath);

    return {
      cycleNumber,
      timestamp: stat.mtime.toISOString(),
      phase,
      agents,
      summary: summary.substring(0, 200),
      output: content,
      success,
      artifacts: artifactMatches,
    };
  } catch {
    return null;
  }
}

export function getAllCycles(): CycleLog[] {
  try {
    if (!fs.existsSync(LOGS_DIR)) return [];

    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => !f.startsWith('.'))
      .sort();

    const cycles: CycleLog[] = [];
    for (const file of files) {
      const filePath = path.join(LOGS_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const log = parseLogFile(filePath, file);
        if (log) cycles.push(log);
      }
    }

    return cycles.sort((a, b) => b.cycleNumber - a.cycleNumber);
  } catch {
    return [];
  }
}

export function getCycleByNumber(num: number): CycleLog | null {
  const cycles = getAllCycles();
  return cycles.find(c => c.cycleNumber === num) || null;
}

export function getMetrics(): MetricsData {
  const cycles = getAllCycles();

  const totalCycles = cycles.length;
  const successCount = cycles.filter(c => c.success).length;
  const successRate = totalCycles > 0 ? (successCount / totalCycles) * 100 : 0;

  // Agent activation counts
  const agentActivationCounts: Record<string, number> = {};
  for (const cycle of cycles) {
    for (const agent of cycle.agents) {
      const key = agent.toLowerCase();
      agentActivationCounts[key] = (agentActivationCounts[key] || 0) + 1;
    }
  }

  // Output velocity
  const outputVelocity = cycles.map(c => ({
    cycle: c.cycleNumber,
    count: c.artifacts.length,
  }));

  // Phase transitions
  const phaseTransitions: MetricsData['phaseTransitions'] = [];
  for (let i = 1; i < cycles.length; i++) {
    if (cycles[i].phase !== cycles[i - 1].phase) {
      phaseTransitions.push({
        cycle: cycles[i].cycleNumber,
        from: cycles[i - 1].phase,
        to: cycles[i].phase,
        timestamp: cycles[i].timestamp,
      });
    }
  }

  // Stall detection (same next action repeated)
  const stallDetections: MetricsData['stallDetections'] = [];

  return {
    totalCycles,
    successRate,
    agentActivationCounts,
    outputVelocity,
    phaseTransitions,
    stallDetections,
  };
}

export function getAgentInteractions(): AgentInteraction[] {
  const cycles = getAllCycles();
  const interactionMap = new Map<string, { count: number; workflows: Set<string> }>();

  for (const cycle of cycles) {
    const agents = cycle.agents;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const key = [agents[i], agents[j]].sort().join('::');
        const existing = interactionMap.get(key) || { count: 0, workflows: new Set<string>() };
        existing.count++;
        existing.workflows.add(cycle.phase);
        interactionMap.set(key, existing);
      }
    }
  }

  return Array.from(interactionMap.entries()).map(([key, data]) => {
    const [agent1, agent2] = key.split('::');
    return {
      agent1,
      agent2,
      count: data.count,
      workflows: Array.from(data.workflows),
    };
  });
}
