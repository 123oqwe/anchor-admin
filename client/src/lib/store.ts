/**
 * Global state store — zustand with SWR caching.
 * Prevents redundant API calls when navigating between pages.
 */
import { create } from "zustand";
import { api } from "./api";

interface AgentInfo {
  name: string;
  successes: number;
  failures: number;
}

interface CacheEntry<T> {
  data: T;
  loadedAt: number;
}

interface AnchorStore {
  // Agent status (shared across 6+ pages)
  agentStatus: AgentInfo[];
  agentStatusLoaded: boolean;
  fetchAgentStatus: () => Promise<void>;

  // User state (shared across Dashboard + Settings)
  userState: { energy: number; focus: number; stress: number } | null;
  userStateLoadedAt: number;
  fetchUserState: () => Promise<void>;

  // Graph data (SWR: 5 min)
  graphCache: CacheEntry<any> | null;
  fetchGraph: () => Promise<any>;
  invalidateGraph: () => void;

  // Dashboard decision (SWR: 5 min)
  decisionCache: CacheEntry<any> | null;
  fetchDecision: () => Promise<any>;

  // Digest (SWR: 2 min)
  digestCache: CacheEntry<any> | null;
  fetchDigest: () => Promise<any>;

  // WebSocket events
  wsEvents: { type: string; payload: any; timestamp: number }[];
  addWsEvent: (type: string, payload: any) => void;
}

const SWR_5MIN = 5 * 60 * 1000;
const SWR_2MIN = 2 * 60 * 1000;
const SWR_1MIN = 60 * 1000;

function isStale(loadedAt: number, ttl: number): boolean {
  return Date.now() - loadedAt > ttl;
}

export const useAnchorStore = create<AnchorStore>((set, get) => ({
  // Agent status
  agentStatus: [],
  agentStatusLoaded: false,
  fetchAgentStatus: async () => {
    if (get().agentStatusLoaded) return;
    try {
      const status = await api.getAgentStatus();
      set({ agentStatus: status, agentStatusLoaded: true });
      setTimeout(() => set({ agentStatusLoaded: false }), SWR_5MIN);
    } catch {}
  },

  // User state
  userState: null,
  userStateLoadedAt: 0,
  fetchUserState: async () => {
    const { userState, userStateLoadedAt } = get();
    if (userState && !isStale(userStateLoadedAt, SWR_1MIN)) return;
    try {
      const state = await api.getState();
      set({ userState: state, userStateLoadedAt: Date.now() });
    } catch {}
  },

  // Graph (SWR 5 min)
  graphCache: null,
  fetchGraph: async () => {
    const { graphCache } = get();
    if (graphCache && !isStale(graphCache.loadedAt, SWR_5MIN)) return graphCache.data;
    try {
      const data = await api.getGraph();
      set({ graphCache: { data, loadedAt: Date.now() } });
      return data;
    } catch { return graphCache?.data ?? null; }
  },
  invalidateGraph: () => set({ graphCache: null }),

  // Decision (SWR 5 min)
  decisionCache: null,
  fetchDecision: async () => {
    const { decisionCache } = get();
    if (decisionCache && !isStale(decisionCache.loadedAt, SWR_5MIN)) return decisionCache.data;
    try {
      const data = await api.getDecisionToday();
      set({ decisionCache: { data, loadedAt: Date.now() } });
      return data;
    } catch { return decisionCache?.data ?? null; }
  },

  // Digest (SWR 2 min)
  digestCache: null,
  fetchDigest: async () => {
    const { digestCache } = get();
    if (digestCache && !isStale(digestCache.loadedAt, SWR_2MIN)) return digestCache.data;
    try {
      const data = await api.getDigest();
      set({ digestCache: { data, loadedAt: Date.now() } });
      return data;
    } catch { return digestCache?.data ?? null; }
  },

  // WebSocket events — keep last 50
  wsEvents: [],
  addWsEvent: (type, payload) => {
    set(s => ({
      wsEvents: [...s.wsEvents.slice(-49), { type, payload, timestamp: Date.now() }],
    }));
    // Invalidate caches on relevant events
    if (["EXECUTION_DONE", "TWIN_UPDATED", "TASK_COMPLETED", "GRAPH_UPDATED"].includes(type)) {
      set({ agentStatusLoaded: false, graphCache: null, decisionCache: null, digestCache: null });
    }
  },
}));
