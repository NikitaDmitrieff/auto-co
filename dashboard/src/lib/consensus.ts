import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';
import type { ConsensusData, CompanyPhase } from './types';

const AUTO_CO_ROOT = path.resolve(process.cwd(), '..');
const CONSENSUS_PATH = path.join(AUTO_CO_ROOT, 'memories', 'consensus.md');

function detectPhase(content: string): CompanyPhase {
  const lower = content.toLowerCase();
  if (lower.includes('phase: growing') || lower.includes('## growing')) return 'growing';
  if (lower.includes('phase: launching') || lower.includes('## launching')) return 'launching';
  if (lower.includes('phase: building') || lower.includes('## building')) return 'building';
  if (lower.includes('phase: validating') || lower.includes('## validating')) return 'validating';
  if (lower.includes('phase: exploring') || lower.includes('## exploring')) return 'exploring';
  if (lower.includes('phase: pivoting') || lower.includes('## pivoting')) return 'pivoting';
  return 'day0';
}

function extractSection(content: string, heading: string): string {
  const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##\\s|$)`, 'i');
  const match = content.match(regex);
  if (!match) return '';
  // Remove the heading itself
  return match[0].replace(/^##\s*[^\n]+\n/, '').trim();
}

function extractCycleNumber(content: string): number {
  const match = content.match(/cycle[:\s#]*(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function extractActiveAgents(content: string): string[] {
  const section = extractSection(content, 'Active Agents') ||
                  extractSection(content, 'Who Acted') ||
                  extractSection(content, 'Agents');
  if (!section) return [];
  // Extract agent names from bullet points or comma-separated
  const agents: string[] = [];
  const lines = section.split('\n');
  for (const line of lines) {
    const match = line.match(/[-*]\s*\*?\*?(\w+)\*?\*?/);
    if (match) agents.push(match[1].toLowerCase());
  }
  return agents;
}

function extractHumanEscalation(content: string): string | null {
  const section = extractSection(content, 'Human Escalation') ||
                  extractSection(content, 'Escalation');
  if (!section || section.toLowerCase().includes('none') || section.trim() === '') return null;
  return section;
}

export async function getConsensus(): Promise<ConsensusData> {
  // Default empty state
  const defaults: ConsensusData = {
    raw: '',
    html: '',
    phase: 'day0',
    cycleNumber: 0,
    streak: 0,
    cyclesSinceLastShip: 0,
    whatWeDid: '',
    nextAction: '',
    humanEscalation: null,
    activeAgents: [],
    timestamp: null,
  };

  try {
    if (!fs.existsSync(CONSENSUS_PATH)) {
      return defaults;
    }

    const raw = fs.readFileSync(CONSENSUS_PATH, 'utf-8');
    const processed = await remark().use(html).process(raw);
    const htmlContent = processed.toString();

    return {
      raw,
      html: htmlContent,
      phase: detectPhase(raw),
      cycleNumber: extractCycleNumber(raw),
      streak: 0, // Calculated from cycle history
      cyclesSinceLastShip: 0,
      whatWeDid: extractSection(raw, 'What We Did'),
      nextAction: extractSection(raw, 'Next Action'),
      humanEscalation: extractHumanEscalation(raw),
      activeAgents: extractActiveAgents(raw),
      timestamp: (() => {
        try {
          const stat = fs.statSync(CONSENSUS_PATH);
          return stat.mtime.toISOString();
        } catch {
          return null;
        }
      })(),
    };
  } catch {
    return defaults;
  }
}
