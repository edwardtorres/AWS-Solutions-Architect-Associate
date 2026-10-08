export interface Edge {
  from: string;
  to: string;
}

export interface Graph {
  nodes: readonly string[];
  /** node -> direct prerequisites */
  prereqs: Map<string, string[]>;
  /** node -> direct dependents */
  dependents: Map<string, string[]>;
}

export function buildGraph(nodes: readonly string[], edges: readonly Edge[]): Graph {
  const prereqs = new Map<string, string[]>(nodes.map((n) => [n, []]));
  const dependents = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    prereqs.get(e.to)?.push(e.from);
    dependents.get(e.from)?.push(e.to);
  }
  return { nodes, prereqs, dependents };
}

/** Kahn's algorithm. Returns null when the graph has a cycle. */
export function topologicalOrder(g: Graph): string[] | null {
  const indegree = new Map(g.nodes.map((n) => [n, g.prereqs.get(n)?.length ?? 0]));
  const queue = g.nodes.filter((n) => indegree.get(n) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const n = queue.shift() as string;
    order.push(n);
    for (const d of g.dependents.get(n) ?? []) {
      const left = (indegree.get(d) ?? 0) - 1;
      indegree.set(d, left);
      if (left === 0) queue.push(d);
    }
  }
  return order.length === g.nodes.length ? order : null;
}

/** Every node reachable by following roads forward from any of `starts` (starts included). */
export function reachableFrom(g: Graph, starts: readonly string[]): Set<string> {
  const seen = new Set<string>(starts);
  const stack = [...starts];
  while (stack.length > 0) {
    const n = stack.pop() as string;
    for (const d of g.dependents.get(n) ?? []) {
      if (!seen.has(d)) {
        seen.add(d);
        stack.push(d);
      }
    }
  }
  return seen;
}

/**
 * Roads that are redundant: `from -> to` is implied when `to` is also reachable from
 * `from` through some other path. A transitive reduction has none.
 */
export function impliedEdges(g: Graph, edges: readonly Edge[]): Edge[] {
  const implied: Edge[] = [];
  for (const e of edges) {
    const others = (g.dependents.get(e.from) ?? []).filter((d) => d !== e.to);
    const reach = reachableFrom(g, others);
    if (reach.has(e.to)) implied.push(e);
  }
  return implied;
}

/** All transitive prerequisites of a node (not including the node). */
export function ancestorsOf(g: Graph, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...(g.prereqs.get(id) ?? [])];
  while (stack.length > 0) {
    const n = stack.pop() as string;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(g.prereqs.get(n) ?? []));
  }
  return seen;
}
