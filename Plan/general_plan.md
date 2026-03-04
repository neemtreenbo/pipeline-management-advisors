# Sales Rep CRM – System Design (MVP)

A minimal, fast, mobile-first CRM designed for **relationship-based sales**, particularly for insurance advisors.

Core philosophy:

1. **Quick Capture**
2. **Relationship Memory**
3. **Deal Progress**

The system is designed as a **graph-enabled CRM**, meaning objects can link to each other instead of living in isolated tables. This enables rich relationship context, backlinks, and timeline intelligence.

---

# Core Principles

### 1. Relationship First
Insurance sales revolves around relationships rather than transactions. The CRM must preserve context such as:

- conversations
- objections
- referrals
- follow-ups
- proposal discussions

### 2. Minimal but Powerful
The system should feel closer to:

- **Todoist** (execution)
- **Trello** (pipeline movement)
- **Notion** (knowledge capture)

Not Salesforce-level complexity.

### 3. Graph Connections
Objects can link to other objects through a `links` table.

Example relationships:

- note → client
- note → note
- proposal → note
- client → client (referral)

This enables **knowledge graphs and backlinks**.

### 4. Activity Timeline
Every meaningful event is stored as an activity.

Examples:

- task created
- deal moved
- note added
- proposal uploaded
- AI summary generated

This powers:

- client history
- deal tracking
- system notifications
- manager insights

---

# Application Structure

## Main Navigation

Mobile:

Home | Pipeline | Tasks | Clients | Notes

Desktop:
Sidebar with same sections.

---

# Feature Areas

## Home (Command Center)

Purpose: show **what to do next**

Widgets:

- Tasks due today
- Overdue tasks
- Deals with no activity
- Proposals needing follow-up
- Relationship triggers (optional)

---

## Clients

Purpose: **relationship record**

Client detail page includes:

- Overview
- Deals
- Tasks
- Notes
- Proposals
- Activity timeline

Clients represent people, households, or companies.

---

## Pipeline

Purpose: **deal progression**

Kanban board inspired by Trello.

Typical stages:

Prospect  
Contacted  
Fact Find  
Proposal Sent  
Underwriting  
Issued  
Lost  

Each deal belongs to a client.

Deal page includes:

- deal details
- proposals
- notes
- tasks
- activity timeline

---

## Notes

Purpose: **relationship memory**

Notes capture:

- meeting summaries
- objections
- context
- insights

Notes can link to:

- client
- deal
- task
- proposal
- other notes

Supports **knowledge linking**.

---

## Tasks

Purpose: **execution system**

Inspired by Todoist.

Views:

- Today
- Upcoming
- Overdue

Tasks can link to:

- client
- deal
- proposal
- note

Tasks ensure promises and follow-ups are executed.

---

## Proposals

Purpose: manage **insurance proposals and plan presentations**

Proposals are tied to deals.

Capabilities:

- upload proposal file
- AI reads proposal
- AI generates summary
- track proposal status
- follow-up scheduling

Example statuses:

draft  
presented  
sent  
revised  
accepted  
rejected  

AI extraction stores structured data.

---

# Database Tables

## 1. profiles

Represents the application user.

Fields:

| field | type | purpose |
|-----|-----|-----|
id | uuid | same as auth.users.id |
email | text | user email |
full_name | text | display name |
avatar_url | text | profile image |
timezone | text | used for reminders |
default_organization_id | uuid | default workspace |
settings | jsonb | preferences |
created_at | timestamptz | creation time |
updated_at | timestamptz | last update |

---

## 2. organizations

Workspace or tenant boundary.

Fields:

| field | type |
|-----|-----|
id | uuid |
name | text |
slug | text |
created_by | uuid |
settings | jsonb |
created_at | timestamptz |
updated_at | timestamptz |

---

## 3. memberships

Connects users to organizations.

Defines roles and permissions.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
user_id | uuid |
role | text |
status | text |
created_at | timestamptz |

Roles may include:

admin  
manager  
member  
viewer  

---

## 4. clients

Represents a relationship entity.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
owner_id | uuid |
name | text |
email | text |
phone | text |
source | text |
tags | text[] |
data | jsonb |
created_at | timestamptz |
updated_at | timestamptz |

---

## 5. deals

Represents a sales opportunity.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
client_id | uuid |
owner_id | uuid |
stage | text |
value | numeric |
expected_close_date | date |
data | jsonb |
created_at | timestamptz |
updated_at | timestamptz |

---

## 6. tasks

Execution items.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
owner_id | uuid |
assignee_id | uuid |
title | text |
description | text |
status | text |
priority | text |
due_at | timestamptz |
completed_at | timestamptz |
data | jsonb |
created_at | timestamptz |
updated_at | timestamptz |

---

## 7. notes

Knowledge capture system.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
author_id | uuid |
title | text |
content | jsonb |
data | jsonb |
created_at | timestamptz |
updated_at | timestamptz |

---

## 8. proposals

Proposal artifact linked to deals.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
deal_id | uuid |
client_id | uuid |
owner_id | uuid |
title | text |
status | text |
proposal_date | timestamptz |
next_follow_up_at | timestamptz |
link_source | text |
storage_path | text |
ai_summary | text |
ai_metadata | jsonb |
data | jsonb |
created_at | timestamptz |
updated_at | timestamptz |

Example `ai_metadata`:

{
  "products": ["VUL"],
  "coverage": 3000000,
  "premium": 45000,
  "currency": "PHP",
  "confidence": 0.84
}

---

## 9. links

Graph relationship table.

Allows flexible connections.

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
from_type | text |
from_id | uuid |
to_type | text |
to_id | uuid |
relation_type | text |
created_by | uuid |
created_at | timestamptz |

Example relationships:

note → client  
note → proposal  
note → note  
client → client (referral)  
task → note  

---

## 10. activities

Append-only event log.

Used for:

- timeline
- notifications
- audit trail
- analytics

Fields:

| field | type |
|-----|-----|
id | uuid |
org_id | uuid |
actor_id | uuid |
entity_type | text |
entity_id | uuid |
event_type | text |
data | jsonb |
created_at | timestamptz |

Example events:

client_created  
deal_created  
deal_stage_changed  
task_assigned  
task_completed  
note_created  
proposal_uploaded  
proposal_ai_summarized  

---

# Storage

Supabase Storage bucket:

proposals/

Used for:

- uploaded proposal PDFs
- extracted documents
- attachments

Stored path is referenced in `proposals.storage_path`.

---

# AI Processing

Proposal upload pipeline:

User uploads proposal  
↓  
File stored in Supabase Storage  
↓  
Webhook triggers AI worker  
↓  
AI extracts summary + metadata  
↓  
proposals.ai_summary updated  
↓  
activities event recorded  

AI extraction may identify:

- coverage amount
- premium
- policy type
- riders
- risks
- summary

---

# Future Expansion

The system is designed to support:

- notifications system
- email integrations
- meeting scheduling
- policy tracking
- analytics dashboards
- AI assistant for advisors

Flexible fields use **jsonb** to avoid schema churn.

---

# Summary

The CRM architecture combines ideas from:

| Tool | Inspiration |
|-----|-----|
Trello | pipeline movement |
Todoist | task execution |
Notion | knowledge linking |
CRM systems | client relationship tracking |

The result is a **lightweight but powerful relationship CRM** optimized for insurance sales.