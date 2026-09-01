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

### 4. BiDi & Multilingual Typography
- Ensure pristine Right-to-Left (RTL) Arabic and Left-to-Right (LTR) English support.
- Isolate English technical terms, HR codes, and file symbols with backticks or dedicated lines to prevent BiDi text reversal.
