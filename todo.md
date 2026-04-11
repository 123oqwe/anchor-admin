# Anchor UI Upgrade Todo

## 1. Onboarding Landing Page (NEW)
- [ ] Create Onboarding.tsx — first page users see
- [ ] Anchor branding + bold capability description (吹牛)
- [ ] Button 1: "Scan my last 14 days" — triggers behavior scan animation
- [ ] Button 2: "Skip to Dashboard" — direct entry
- [ ] After scan: show generated Human Graph summary, then proceed to Dashboard
- [ ] Update App.tsx routing: / → Onboarding, /dashboard → Dashboard

## 2. Dashboard — Interactive Human Graph
- [ ] Replace static image with interactive domain-based visualization
- [ ] Show domains as clusters (Work, Relationships, Health, Finance, Growth, etc.)
- [ ] Each domain is clickable → expands to show related items (goals, people, tasks)
- [ ] Remove single-list display of goals/relationships; merge into domain graph
- [ ] Keep Decision Surface, State Projection, Quick Input

## 3. Advisor — 3 Modules + Execution Agent
- [ ] Module 1: "Personal Advisor" — advise from YOUR perspective (Plan Yourself 1)
- [ ] Module 2: "General AI" — direct LLM connection like ChatGPT (Plan Yourself 2)
- [ ] Module 3: "Agent Mode" — create an agent to execute tasks for you
- [ ] Add Execution Agent panel — shows running agents with status
- [ ] Each agent has "+/- execute" controls and success/fail indicators

## 4. Twin Agent — Gamified Evolution + Project Features
- [ ] Replace Evolution Log with RPG-style level-up system
- [ ] Each stage has XP bar, usage milestones to unlock next level
- [ ] Projects are editable even after creation
- [ ] Add "Merge Projects" — combine two projects for parallel execution
- [ ] Add "Execute" button on projects → triggers execution agent
- [ ] All agents show "+/- execute" status indicators

## 5. Global Agent Status
- [ ] Every agent across all pages shows "+/- execute" success indicator
- [ ] Sidebar shows active agent count
