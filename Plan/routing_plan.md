# Sales Rep CRM – Routing Plan

This document defines the routing architecture for the Sales Rep CRM application.

The goal is to maintain:

- One unified route system
- Responsive layouts for desktop and mobile
- Clean deep-linking
- Future compatibility with Capacitor mobile apps

The routing system should not separate mobile and web into different URLs.

Instead, the same route loads different layouts depending on device size.


--------------------------------------------------
CORE ROUTING PRINCIPLE
--------------------------------------------------

Use one route tree for the entire application.

/

  /login
  /signup

  /app
    /app/home
    /app/pipeline
    /app/tasks
    /app/clients
    /app/clients/:clientId
    /app/deals/:dealId
    /app/notes
    /app/settings

Both desktop and mobile access the same routes.

The UI adapts via responsive layouts.


--------------------------------------------------
WHY WE DO NOT USE /MOBILE ROUTES
--------------------------------------------------

Avoid:

/mobile/home
/mobile/clients
/mobile/tasks

Problems with mobile-specific routes:

- Duplicate routing logic
- Harder maintenance
- Deep linking problems
- SEO conflicts
- More complexity when adding native wrappers

Modern apps like Notion, Slack, Linear, and Todoist use the same routes for all devices.


--------------------------------------------------
LAYOUT STRATEGY
--------------------------------------------------

Instead of route separation, we use layout switching.

Example logic:

if (isMobile) {
  render MobileLayout
} else {
  render DesktopLayout
}

Layouts determine navigation style.


--------------------------------------------------
DESKTOP LAYOUT
--------------------------------------------------

Desktop interface uses a sidebar navigation.

Sidebar
-------
Home
Pipeline
Clients
Tasks
Notes
Settings

Content area supports:

- multi-panel views
- tables
- side drawers


--------------------------------------------------
MOBILE LAYOUT
--------------------------------------------------

Mobile interface uses bottom navigation.

Bottom Navigation
-----------------
Home | Pipeline | Tasks | Clients | Notes

Mobile UI patterns:

- stacked views
- drawers instead of side panels
- full screen modals
- swipe gestures


--------------------------------------------------
ROUTE DEFINITIONS
--------------------------------------------------

PUBLIC ROUTES

/
/login
/signup

Purpose:

- landing page
- authentication
- onboarding


--------------------------------------------------
APPLICATION ROOT
--------------------------------------------------

/app

All authenticated pages live under /app.


--------------------------------------------------
CORE APPLICATION ROUTES
--------------------------------------------------

HOME

/app/home

Purpose:

Daily command center showing:

- tasks due today
- overdue tasks
- deals needing follow-up
- proposal reminders


--------------------------------------------------
PIPELINE

/app/pipeline

Kanban board for deal progression.

Typical stages:

Prospect
Contacted
Fact Find
Proposal Sent
Underwriting
Issued
Lost


--------------------------------------------------
CLIENTS

/app/clients
/app/clients/:clientId

Clients list view and client detail page.

Client page contains:

- overview
- deals
- tasks
- notes
- proposals
- activity timeline


--------------------------------------------------
DEALS

/app/deals/:dealId

Deal detail page.

Includes:

- deal information
- proposals
- notes
- tasks
- timeline


--------------------------------------------------
TASKS

/app/tasks

Task manager inspired by Todoist.

Views:

- Today
- Upcoming
- Overdue


--------------------------------------------------
NOTES

/app/notes
/app/notes/:noteId

Knowledge capture system.

Supports linking to:

- clients
- deals
- tasks
- proposals
- other notes


--------------------------------------------------
SETTINGS

/app/settings

User preferences and organization settings.

Examples:

- profile settings
- notification preferences
- workspace configuration


--------------------------------------------------
DEEP LINKING
--------------------------------------------------

All entities must support direct URLs.

Examples:

/app/clients/123
/app/deals/456
/app/notes/789

Benefits:

- easy sharing
- browser navigation
- bookmarking
- notification links


--------------------------------------------------
MOBILE COMPATIBILITY
--------------------------------------------------

The routing structure supports native wrappers via Capacitor.

Mobile apps will simply load:

https://yourdomain.com/app

No special mobile routes are required.


--------------------------------------------------
FUTURE ROUTE EXPANSION
--------------------------------------------------

Possible future routes:

/app/notifications
/app/search
/app/analytics
/app/policies
/app/calendar


--------------------------------------------------
FOLDER STRUCTURE EXAMPLE
--------------------------------------------------

Example React structure:

src/
  app/
    layout.tsx
    home/
      page.tsx
    pipeline/
      page.tsx
    clients/
      page.tsx
      [clientId]/
        page.tsx
    deals/
      [dealId]/
        page.tsx
    tasks/
      page.tsx
    notes/
      page.tsx
      [noteId]/
        page.tsx
    settings/
      page.tsx


Layouts:

layouts/
  DesktopLayout.tsx
  MobileLayout.tsx


--------------------------------------------------
SUMMARY
--------------------------------------------------

The routing system follows these rules:

1. One route structure for all devices
2. Responsive UI determines layout
3. All app routes live under /app
4. Entities support deep linking
5. Mobile wrapper compatibility via Capacitor

This architecture keeps the system:

- simple
- scalable
- maintainable
- future-proof