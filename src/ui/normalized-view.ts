import type { CasePackage } from '../domain/types.js';

export interface NormalizedPlayerView {
  node_body: string;
  choices: Array<{ id: string; label: string }>;
  objective_checklist: Array<{ id: string; description: string }>;
  mission_status: { current_node_id: string; objective_count: number };
  locations?: string[];
}

export function getNormalizedPlayerView(pkg: CasePackage, currentNodeId: string): NormalizedPlayerView {
  const node = pkg.nodes.find((n) => n.node_id === currentNodeId) ?? pkg.nodes[0];
  const locations = [...new Set(pkg.nodes.map((n) => n.location).filter(Boolean))] as string[];
  return {
    node_body: node.body,
    choices: node.choices.map((c) => ({ id: c.choice_id, label: c.label })),
    objective_checklist: pkg.objectives.map((o) => ({ id: o.objective_id, description: o.description })),
    mission_status: {
      current_node_id: node.node_id,
      objective_count: pkg.objectives.length,
    },
    locations: locations.length > 0 ? locations : undefined,
  };
}
