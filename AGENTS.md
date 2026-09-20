# Project System Rules: Mandatory UI/UX Pro Max Standard

## Core Directive
Whenever designing, generating, reviewing, modifying, or refactoring ANY UI components, pages, layouts, modals, navigation, animations, or styling in this codebase, you MUST ALWAYS strictly follow and enforce the design intelligence and guidelines located in `.antigravity/skills/ui-ux-pro-max/` (and `.agents/skills/ui-ux-pro-max/`).

This rule is **permanently active** and applies unconditionally to every turn and task without requiring the user to explicitly mention it in their prompt.

---

## Key Enforced Principles

### 1. Visual Hierarchy & Executive Aesthetic
- Maintain the official Orascom Executive Design Language:
  - Primary Brand Navy: `#002D62`
  - Accent Corporate Gold: `#FFC000`
  - High-contrast, accessible dark/light theme palettes.
- Apply clean visual hierarchy, generous whitespace, unified rounded corners (`rounded-xl`, `rounded-2xl`), and subtle elevation shadows.

### 2. Interaction & State Management
- **Zero Blank-Screen Rule:** Never leave any view or role state unhandled. Always provide smooth fallback navigation directly to the primary Dashboard.
- **Micro-Interactions & Transitions:** Fast, intentional UI feedback (`150ms–250ms`, `ease-out`), smooth hover states, and clear loading/skeleton indicators.
- **Scroll & Position Reset:** Automatically scroll to top on major route/role switches.

### 3. Data Integrity & Reality
- Render **100% Verified Real Data** originating from the official master Excel records and live Firestore collections.
- Never inject fake course titles, assumed departments, or synthetic mock arrays.
- All courses in plans, sessions, or catalogs must come strictly from user creation or live database/Excel data. Never assume, fabricate, or pre-populate hypothetical courses or venues.

### 4. Language Standard: Strictly English Only (No Arabic)
- **Mandatory English-Only Rule:** Arabic is strictly prohibited across all system interfaces, components, buttons, badges, tables, modal dialogs, notifications, and user-facing text.
- All UI text, course titles, locations, notes, months, statuses, tooltips, and labels MUST be written strictly in English.
- Do not render Arabic strings, translations, or RTL Arabic text anywhere. Keep typography Left-to-Right (LTR).

### 5. Deployment & Execution Speed: Never Poll or Wait for Vercel
- When pushing commits to GitHub, complete the push and notify the user immediately.
- **NEVER** set timers, loops, or background tasks to wait for or monitor Vercel deployment.
- Vercel automatically builds and deploys in the background; blocking or polling Vercel wastes time and disrupts the user's active momentum.
