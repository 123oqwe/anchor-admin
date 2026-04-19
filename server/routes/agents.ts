import { Router } from "express";
import { db, DEFAULT_USER_ID } from "../infra/storage/db.js";
import { nanoid } from "nanoid";
import { generateSelfPortrait } from "../cognition/self-portrait.js";
import { analyzeExecutionTraces } from "../cognition/gepa.js";

const router = Router();

router.get("/status", (_req, res) => {
  const agents = ["Decision Agent", "Observation Agent", "Memory Agent", "Twin Agent", "Execution Agent", "Workspace Agent"];
  const result = agents.map(name => {
    const rows = db.prepare("SELECT status FROM agent_executions WHERE user_id=? AND agent=?").all(DEFAULT_USER_ID, name) as any[];
    const successes = rows.filter(r => r.status === "success").length;
    const failures = rows.filter(r => r.status === "failed").length;
    return { name, successes, failures };
  });
  res.json(result);
});

router.get("/executions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM agent_executions WHERE user_id=? ORDER BY created_at DESC LIMIT 50").all(DEFAULT_USER_ID);
  res.json(rows);
});

router.post("/executions", (req, res) => {
  const { agent, action, status } = req.body;
  const id = nanoid();
  db.prepare("INSERT INTO agent_executions (id, user_id, agent, action, status) VALUES (?,?,?,?,?)")
    .run(id, DEFAULT_USER_ID, agent, action, status ?? "success");
  res.json({ id });
});

router.get("/gepa", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const analysis = await analyzeExecutionTraces(days);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/self-portrait", async (_req, res) => {
  try {
    const portrait = await generateSelfPortrait();
    res.json(portrait);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
