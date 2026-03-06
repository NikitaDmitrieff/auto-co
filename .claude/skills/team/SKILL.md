---
name: team
description: "Quickly assemble a temporary AI Agent team for a given task. Automatically selects the best members from .claude/agents/."
argument-hint: "[task description]"
disable-model-invocation: true
---

# Assemble a Temporary Team

Based on the task below, select the most suitable members from the company's AI Agent roster and form a temporary team to collaborate on it.

## Task

$ARGUMENTS

## Available Agents

All company Agents are defined in the `.claude/agents/` directory:

| Agent | File | Role |
|-------|------|------|
| CEO | `ceo-bezos` | Strategic decisions, business models, PR/FAQ, prioritization |
| CTO | `cto-vogels` | Technical architecture, technology selection, system design |
| Contrarian Thinker | `critic-munger` | Challenge decisions, identify fatal flaws, Pre-Mortem, prevent groupthink |
| Product Design | `product-norman` | Product definition, user experience, usability |
| UI Design | `ui-duarte` | Visual design, design system, color and typography |
| Interaction Design | `interaction-cooper` | User flows, Personas, interaction patterns |
| Full-Stack Dev | `fullstack-dhh` | Code implementation, technical proposals, development |
| QA | `qa-bach` | Test strategy, quality gates, bug analysis |
| DevOps/SRE | `devops-hightower` | Deployment pipelines, CI/CD, infrastructure, monitoring |
| Marketing | `marketing-godin` | Positioning, brand, acquisition, content |
| Operations | `operations-pg` | User ops, growth, community, PMF |
| Sales | `sales-ross` | Sales funnel, conversion strategy |
| CFO | `cfo-campbell` | Pricing strategy, financial models, cost control, unit economics |
| Research Analyst | `research-thompson` | Market research, competitive analysis, industry trends, opportunity discovery |

## Execution Steps

### 1. Analyze the Task and Select Members

Based on the nature of the task, choose 2-5 of the most relevant Agents as team members. Selection principles:
- **Only pick who's necessary**: more people is not better -- match precisely to the task
- **Consider the collaboration chain**: if the task spans from design to development, ensure all key roles in the chain are present
- **Avoid redundancy**: don't pick agents with overlapping responsibilities

Briefly explain who you selected and why, then immediately begin assembling.

### 2. Assemble the Agent Team

Use the Agent Teams feature to build a temporary team:
- Create a team with a `team_name` based on a short task description (English, kebab-case)
- Create specific tasks for each member (TaskCreate) with enough context in the description
- Use the Task tool to spawn each teammate; set `subagent_type` to `general-purpose`; inject the full content of the corresponding agent file into the prompt as their role definition
- When spawning a teammate, tell them via prompt: their role definition, the task to complete, and that output documents go in `docs/<role>/`

### 3. Coordinate and Consolidate

- As team lead, coordinate all members' work
- Collect outputs from each member and consolidate into a unified conclusion or plan
- If there are disagreements, list each side's arguments for the CEO to decide
- Clean up team resources when done

## Important Notes

- All communication in English
- Each member's output documents go in `docs/<role>/` as specified
- Teams are temporary -- disband after the task is complete
- CEO is the ultimate decision-maker; Agents provide recommendations but do not override decisions
