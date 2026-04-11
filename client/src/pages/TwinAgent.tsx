import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  Shield,
  Eye,
  FileEdit,
  Zap,
  Brain,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Info,
  Star,
  Trophy,
  Swords,
  Flame,
  Crown,
  Target,
  Plus,
  Minus,
  Bot,
  Play,
  Merge,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const TWIN_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663309741543/XAV3v9QesjBrkPBXbAU6Pq/anchor-twin-V6HnhyxtWXhYsVfAuB9vqz.webp";

// Gamified evolution stages
interface EvolutionStage {
  level: number;
  name: string;
  icon: typeof Star;
  color: string;
  bgColor: string;
  xpRequired: number;
  xpCurrent: number;
  unlocked: boolean;
  description: string;
  rewards: string[];
  quests: Quest[];
}

interface Quest {
  id: string;
  name: string;
  description: string;
  progress: number;
  total: number;
  completed: boolean;
  xpReward: number;
}

const evolutionStages: EvolutionStage[] = [
  {
    level: 1,
    name: "Observer",
    icon: Eye,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    xpRequired: 100,
    xpCurrent: 100,
    unlocked: true,
    description: "The Twin watches and learns. It reads your behavior, maps your patterns, and builds a baseline model of who you are.",
    rewards: ["Behavioral pattern recognition", "Decision style analysis", "Energy cycle detection"],
    quests: [
      { id: "q1", name: "First 50 Interactions", description: "Complete 50 interactions with Anchor", progress: 50, total: 50, completed: true, xpReward: 30 },
      { id: "q2", name: "State Check-in Streak", description: "Update your state 7 days in a row", progress: 7, total: 7, completed: true, xpReward: 20 },
      { id: "q3", name: "Graph Calibration", description: "Let the Twin analyze 14 days of behavior", progress: 14, total: 14, completed: true, xpReward: 50 },
    ],
  },
  {
    level: 2,
    name: "Advisor",
    icon: FileEdit,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    xpRequired: 300,
    xpCurrent: 245,
    unlocked: true,
    description: "The Twin starts suggesting. It generates drafts, surfaces priorities, and alerts you to avoidance patterns. Everything requires your review.",
    rewards: ["Priority suggestions", "Draft generation", "Avoidance alerts", "Relationship decay warnings"],
    quests: [
      { id: "q4", name: "Approve 20 Drafts", description: "Review and approve 20 Twin-generated drafts", progress: 16, total: 20, completed: false, xpReward: 40 },
      { id: "q5", name: "Follow 10 Suggestions", description: "Act on 10 Twin suggestions within 24h", progress: 7, total: 10, completed: false, xpReward: 35 },
      { id: "q6", name: "Avoidance Breakthrough", description: "Complete 3 tasks the Twin flagged as avoided", progress: 2, total: 3, completed: false, xpReward: 50 },
    ],
  },
  {
    level: 3,
    name: "Executor",
    icon: Shield,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    xpRequired: 600,
    xpCurrent: 0,
    unlocked: false,
    description: "The Twin can act on your behalf — but only with explicit approval. Every action flows through Draft → Preview → Approve → Execute.",
    rewards: ["Send approved emails", "Schedule calendar events", "Create and assign tasks", "Execute workflows"],
    quests: [
      { id: "q7", name: "Trust Protocol", description: "Approve 50 actions with zero rollbacks", progress: 0, total: 50, completed: false, xpReward: 80 },
      { id: "q8", name: "Workflow Master", description: "Create and execute 5 multi-step workflows", progress: 0, total: 5, completed: false, xpReward: 60 },
      { id: "q9", name: "Zero Error Week", description: "7 days with no rejected Twin actions", progress: 0, total: 7, completed: false, xpReward: 100 },
    ],
  },
  {
    level: 4,
    name: "Autonomous",
    icon: Crown,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    xpRequired: 1000,
    xpCurrent: 0,
    unlocked: false,
    description: "The Twin acts independently within strict boundaries. Reserved for low-risk, high-frequency actions you've explicitly pre-approved. The ultimate form of trust.",
    rewards: ["Auto-respond to routine messages", "Auto-schedule recurring tasks", "Proactive opportunity detection", "Self-optimizing workflows"],
    quests: [
      { id: "q10", name: "Perfect Trust Score", description: "Maintain 99% approval rate over 30 days", progress: 0, total: 30, completed: false, xpReward: 150 },
      { id: "q11", name: "Delegation Master", description: "Successfully delegate 100 actions", progress: 0, total: 100, completed: false, xpReward: 200 },
      { id: "q12", name: "Second Self", description: "Twin accurately predicts your decisions 90% of the time", progress: 0, total: 90, completed: false, xpReward: 300 },
    ],
  },
];

const twinInsights = [
  {
    category: "Decision Style",
    insight: "You tend to delay high-stakes decisions by 2-3 days on average. When you do decide, 78% of outcomes are positive.",
    confidence: 0.82,
    trend: "stable" as const,
  },
  {
    category: "Risk Preference",
    insight: "Moderate risk tolerance for business decisions, conservative for personal. You avoid confrontation-related tasks.",
    confidence: 0.75,
    trend: "evolving" as const,
  },
  {
    category: "Behavioral Pattern",
    insight: "Peak productivity between 10am-1pm. Energy drops significantly after 3pm. You procrastinate most on writing tasks.",
    confidence: 0.91,
    trend: "stable" as const,
  },
  {
    category: "Avoidance Detection",
    insight: "Currently avoiding: investor follow-up emails (3 days), team performance review (1 week), personal budget review.",
    confidence: 0.88,
    trend: "worsening" as const,
  },
];

// Project management for Twin
interface TwinProject {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "merged";
  progress: number;
  tasks: number;
  completedTasks: number;
  mergedWith?: string;
}

const initialProjects: TwinProject[] = [
  { id: "tp1", name: "YC Application Prep", status: "active", progress: 65, tasks: 8, completedTasks: 5 },
  { id: "tp2", name: "Investor Outreach", status: "active", progress: 30, tasks: 6, completedTasks: 2 },
  { id: "tp3", name: "CTO Hiring Pipeline", status: "paused", progress: 45, tasks: 5, completedTasks: 2 },
  { id: "tp4", name: "Product Roadmap v2", status: "active", progress: 80, tasks: 10, completedTasks: 8 },
];

export default function TwinAgent() {
  const [activeStage, setActiveStage] = useState<number>(2);
  const [projects, setProjects] = useState(initialProjects);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const totalXP = evolutionStages.reduce((a, s) => a + s.xpCurrent, 0);
  const currentStage = evolutionStages.find((s) => !s.unlocked) || evolutionStages[evolutionStages.length - 1];
  const currentLevel = evolutionStages.filter((s) => s.unlocked).length;

  const handleMerge = () => {
    if (mergeSelection.length < 2) return;
    const names = mergeSelection.map((id) => projects.find((p) => p.id === id)?.name).filter(Boolean);
    const mergedProject: TwinProject = {
      id: `tp${Date.now()}`,
      name: `${names.join(" + ")} (Merged)`,
      status: "active",
      progress: 0,
      tasks: mergeSelection.reduce((a, id) => a + (projects.find((p) => p.id === id)?.tasks || 0), 0),
      completedTasks: mergeSelection.reduce((a, id) => a + (projects.find((p) => p.id === id)?.completedTasks || 0), 0),
    };
    setProjects((prev) => [
      mergedProject,
      ...prev.map((p) => mergeSelection.includes(p.id) ? { ...p, status: "merged" as const, mergedWith: mergedProject.id } : p),
    ]);
    setMergeSelection([]);
    setMergeMode(false);
  };

  const startEdit = (project: TwinProject) => {
    setEditingProject(project.id);
    setEditName(project.name);
  };

  const saveEdit = () => {
    if (!editingProject || !editName.trim()) return;
    setProjects((prev) => prev.map((p) => p.id === editingProject ? { ...p, name: editName } : p));
    setEditingProject(null);
    setEditName("");
  };

  return (
    <div className="min-h-screen dot-grid">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <img src={TWIN_IMG} alt="" className="w-full h-full object-cover object-top" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="relative px-8 pt-8 pb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary tracking-wider uppercase">Digital Twin</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Your Second Self</h1>
                <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
                  The Twin learns how you think, decide, and act. Level up by using it — unlock new capabilities as trust grows.
                </p>
              </div>

              {/* XP Summary */}
              <div className="hidden lg:block glass rounded-xl p-4 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-foreground">Level {currentLevel}</span>
                  <span className="text-xs text-muted-foreground">/ 4</span>
                </div>
                <div className="text-2xl font-bold font-mono text-primary mb-1">{totalXP} XP</div>
                <div className="flex items-center gap-2 text-[10px]">
                  <Bot className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Twin Agent</span>
                  <Plus className="h-2 w-2 text-emerald-400" />
                  <span className="text-emerald-400">23</span>
                  <Minus className="h-2 w-2 text-red-400" />
                  <span className="text-red-400">2</span>
                  <span className="text-muted-foreground">exec</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <Tabs defaultValue="evolution" className="space-y-6">
          <TabsList className="glass border-0 p-1">
            <TabsTrigger value="evolution" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-1.5">
              <Swords className="h-3 w-3" />
              Evolution
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* Evolution Tab — Gamified */}
          <TabsContent value="evolution" className="space-y-4">
            {evolutionStages.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = i + 1 === activeStage;
              const progressPct = stage.xpRequired > 0 ? Math.min((stage.xpCurrent / stage.xpRequired) * 100, 100) : 0;

              return (
                <motion.div
                  key={stage.level}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`glass rounded-xl overflow-hidden transition-all cursor-pointer ${
                    stage.unlocked ? stage.bgColor.replace("/10", "/5") : "opacity-60"
                  }`}
                  style={{ borderWidth: "1px", borderColor: isActive ? "rgba(255,255,255,0.1)" : "transparent" }}
                  onClick={() => setActiveStage(stage.level)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${stage.bgColor} flex items-center justify-center shrink-0 relative`}>
                          <Icon className={`h-6 w-6 ${stage.color}`} />
                          {stage.unlocked && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {!stage.unlocked && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                              <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-[10px] font-mono ${stage.bgColor} ${stage.color}`}>
                              LV.{stage.level}
                            </Badge>
                            <h3 className="text-sm font-bold text-foreground">{stage.name}</h3>
                            {stage.unlocked && <Flame className="h-3 w-3 text-amber-400" />}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                            {stage.description}
                          </p>
                        </div>
                      </div>

                      {/* XP Progress */}
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-lg font-bold font-mono text-foreground">{stage.xpCurrent}</span>
                        <span className="text-xs text-muted-foreground"> / {stage.xpRequired} XP</span>
                      </div>
                    </div>

                    {/* XP Bar */}
                    <div className="mt-4 pl-16">
                      <Progress value={progressPct} className="h-2" />
                    </div>

                    {/* Quests — expandable */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 pl-16 space-y-4">
                            {/* Rewards */}
                            <div>
                              <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">Rewards</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {stage.rewards.map((r) => (
                                  <div key={r} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Star className={`h-3 w-3 ${stage.color} shrink-0`} />
                                    <span>{r}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quests */}
                            <div>
                              <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">Quests</h4>
                              <div className="space-y-2">
                                {stage.quests.map((quest) => (
                                  <div key={quest.id} className="glass rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        {quest.completed ? (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        ) : (
                                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                        <span className={`text-xs font-medium ${quest.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                          {quest.name}
                                        </span>
                                      </div>
                                      <Badge className="text-[9px] bg-amber-500/10 text-amber-400">
                                        +{quest.xpReward} XP
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-2 pl-5">{quest.description}</p>
                                    <div className="pl-5">
                                      <div className="flex items-center gap-2">
                                        <Progress value={(quest.progress / quest.total) * 100} className="h-1 flex-1" />
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          {quest.progress}/{quest.total}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {twinInsights.map((insight, i) => (
              <motion.div
                key={insight.category}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{insight.category}</h3>
                    <Badge className={`text-[10px] ${
                      insight.trend === "stable" ? "bg-emerald-500/10 text-emerald-400" :
                      insight.trend === "evolving" ? "bg-blue-500/10 text-blue-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {insight.trend === "worsening" && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {insight.trend === "stable" && <TrendingUp className="h-3 w-3 mr-1" />}
                      {insight.trend}
                    </Badge>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.insight}</p>
                <div className="mt-3">
                  <Progress value={insight.confidence * 100} className="h-1" />
                </div>
              </motion.div>
            ))}
          </TabsContent>

          {/* Projects Tab — Editable, Mergeable, Executable */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Twin-Managed Projects</h3>
              <div className="flex items-center gap-2">
                {mergeMode ? (
                  <>
                    <button
                      onClick={handleMerge}
                      disabled={mergeSelection.length < 2}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-30"
                    >
                      <Merge className="h-3 w-3" />
                      Merge Selected ({mergeSelection.length})
                    </button>
                    <button
                      onClick={() => { setMergeMode(false); setMergeSelection([]); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setMergeMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Merge className="h-3 w-3" />
                    Merge Projects
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {projects.filter((p) => p.status !== "merged").map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`glass rounded-xl p-4 transition-all ${
                    mergeMode && mergeSelection.includes(project.id) ? "border-purple-500/30" : ""
                  }`}
                  style={{ borderWidth: "1px", borderColor: mergeMode && mergeSelection.includes(project.id) ? "rgba(168,85,247,0.3)" : "transparent" }}
                >
                  <div className="flex items-center gap-3">
                    {mergeMode && (
                      <input
                        type="checkbox"
                        checked={mergeSelection.includes(project.id)}
                        onChange={() => {
                          setMergeSelection((prev) =>
                            prev.includes(project.id)
                              ? prev.filter((id) => id !== project.id)
                              : [...prev, project.id]
                          );
                        }}
                        className="w-4 h-4 rounded border-border accent-purple-500"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {editingProject === project.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            onBlur={saveEdit}
                            className="bg-transparent text-sm font-semibold text-foreground border-b border-primary/30 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <h4
                            className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={() => startEdit(project)}
                          >
                            {project.name}
                          </h4>
                        )}
                        <Badge className={`text-[9px] ${
                          project.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                          project.status === "paused" ? "bg-amber-500/10 text-amber-400" :
                          "bg-blue-500/10 text-blue-400"
                        }`}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{project.completedTasks}/{project.tasks} tasks</span>
                        <span>{project.progress}% complete</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress value={project.progress} className="w-24 h-1.5" />
                      <button
                        onClick={() => startEdit(project)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors">
                        <Play className="h-3 w-3" />
                        Execute
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Merged projects archive */}
            {projects.some((p) => p.status === "merged") && (
              <div className="mt-6">
                <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-3">Merged (Archived)</h4>
                <div className="space-y-2">
                  {projects.filter((p) => p.status === "merged").map((project) => (
                    <div key={project.id} className="glass rounded-lg p-3 opacity-50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Merge className="h-3 w-3" />
                        <span className="line-through">{project.name}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>Merged into new project</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass rounded-lg p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Projects are living entities.</strong> Edit names anytime, merge related projects to execute in parallel, 
                and use the Execute button to let the Twin's Execution Agent handle the work — with your approval at every step.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
