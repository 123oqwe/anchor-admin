/**
 * L4 Orchestration — Event router.
 * Maps bus events to the appropriate subsystem.
 * Does NOT contain business logic — only routing/dispatch.
 *
 *   USER_CONFIRMED  → Execution Agent (ReAct) + Twin Agent (sidecar)
 *   EXECUTION_DONE  → Twin Agent (result learning)
 *   TWIN_UPDATED    → Memory Agent (persist as semantic)
 *   GRAPH_UPDATED   → Observation Agent (record episodic + cascade)
 *   TASK_COMPLETED  → Twin Agent (XP grant)
 */
import { bus, type AnchorEvent } from "./bus.js";
import { runExecutionReAct } from "../execution/agent.js";
import { twinLearnFromEdits, twinLearnFromResults } from "../cognition/twin.js";
import { persistInsightAsSemanticMemory, recordGraphChange, grantTaskCompletionXp } from "../cognition/observation.js";

async function onUserConfirmed(payload: any) {
  // Fire Twin sidecar async (non-blocking)
  twinLearnFromEdits(payload.changes).catch(err =>
    console.error("[Twin Sidecar] Error:", err.message)
  );
  // Run Execution Agent synchronously
  await runExecutionReAct(payload.user_steps);
}

export function startEventHandlers() {
  bus.on("event", (e: AnchorEvent) => {
    switch (e.type) {
      case "USER_CONFIRMED":  onUserConfirmed(e.payload);                     break;
      case "EXECUTION_DONE":  twinLearnFromResults(e.payload);                break;
      case "TWIN_UPDATED":    persistInsightAsSemanticMemory(e.payload.insight); break;
      case "GRAPH_UPDATED":   recordGraphChange(e.payload.nodeId, e.payload.status, e.payload.label); break;
      case "TASK_COMPLETED":  grantTaskCompletionXp(e.payload.title);         break;
    }
  });
  console.log("⚡ Orchestration wired: USER_CONFIRMED → Execution(ReAct) + Twin(sidecar) | EXECUTION_DONE → Twin | GRAPH_UPDATED → Observation");
}
