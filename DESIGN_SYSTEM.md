# Design System: Command Center Aesthetic

This document defines the design system for the Creator Scraper application. All future updates MUST follow these principles.

---

## Core Philosophy

**This is a HUNTING TOOL for professionals.**

The user is a growth operator - a professional who hunts for high-value creator partnerships. The interface should feel like a **command center** or **trading terminal** - serious, powerful, data-forward.

### Emotional Goals
- **Powerful** - The user feels in control
- **Professional** - This is a serious tool, not a toy
- **Focused** - Zero distractions, data is hero
- **Rewarding** - Finding qualified creators feels like striking gold

---

## Color Palette

### Backgrounds (Layered Darkness)
```css
--bg-deep: #0a0a0b;        /* Deepest background */
--bg-base: #0f0f10;        /* Main background */
--bg-surface: #161618;     /* Cards, elevated surfaces */
--bg-elevated: #1c1c1f;    /* Hover states, highlights */
--bg-border: #2a2a2e;      /* Borders, dividers */
```

### Text
```css
--text-primary: #f4f4f5;   /* Primary text - high contrast */
--text-secondary: #a1a1aa; /* Secondary text */
--text-muted: #52525b;     /* Muted, disabled */
```

### Signal Colors (Color = Meaning)
```css
--signal-success: #22c55e;     /* Qualified, success - GREEN = MONEY */
--signal-success-dim: #166534; /* Success background */
--signal-action: #06b6d4;      /* Actionable items (email) - CYAN */
--signal-action-dim: #164e63;  /* Action background */
--signal-warning: #eab308;     /* Processing, pending */
--signal-danger: #ef4444;      /* Errors, not qualified */
--signal-neutral: #3f3f46;     /* Neutral states */
```

### Accent (Sparingly)
```css
--accent-glow: #8b5cf6;        /* Purple glow for special moments */
--accent-gold: #fbbf24;        /* Gold for "found treasure" moments */
```

---

## Typography

### Font Stack
```css
/* Display/Headings - Bold, confident */
font-family: 'Inter', -apple-system, sans-serif;
font-weight: 600-700;

/* Body - Clean, readable */
font-family: 'Inter', -apple-system, sans-serif;
font-weight: 400-500;

/* Data/Numbers - Monospace for that terminal feel */
font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

### Scale
```css
--text-xs: 0.75rem;    /* 12px - Labels, metadata */
--text-sm: 0.875rem;   /* 14px - Secondary content */
--text-base: 1rem;     /* 16px - Body */
--text-lg: 1.125rem;   /* 18px - Emphasis */
--text-xl: 1.25rem;    /* 20px - Section headers */
--text-2xl: 1.5rem;    /* 24px - Page headers */
--text-3xl: 1.875rem;  /* 30px - Hero text */
```

---

## Components

### Cards/Surfaces
- Background: `--bg-surface`
- Border: 1px solid `--bg-border`
- Border radius: 12px (slightly rounded, not bubbly)
- NO drop shadows - use borders and background layers instead

### Buttons
**Primary (Actions)**
- Background: `--signal-action`
- Text: `--bg-deep`
- Hover: Brightness increase + subtle glow

**Secondary**
- Background: `--bg-elevated`
- Border: 1px solid `--bg-border`
- Text: `--text-primary`

**Ghost**
- Background: transparent
- Text: `--text-secondary`
- Hover: `--bg-elevated`

### Data Tables
- Header: `--bg-elevated`, uppercase, `--text-muted`, monospace
- Rows: Alternating subtle backgrounds
- Hover: `--bg-elevated` with left border accent
- **Qualified rows**: Subtle green left border, slightly brighter
- **Has email**: Cyan glow on email cell

### Progress/Status
- Use animated gradient sweeps, not static bars
- Show LIVE data during processing
- Numbers should tick up in real-time

---

## Motion Principles

### General
- Transitions: 150-200ms ease-out
- Never instant, never slow
- Motion should feel RESPONSIVE

### Key Moments
1. **Niche Selection**: Scale + glow on click
2. **Search Start**: Pulse animation on button
3. **Processing**: Scanning line animation, live feed effect
4. **Result Appears**: Fade in + slide up, staggered
5. **Qualified Found**: Brief glow pulse, subtle celebration
6. **Export**: Satisfying click feedback

### Hover States
- Subtle brightness increase
- Slight scale (1.01-1.02) for clickable items
- Color shifts toward accent

---

## Layout Principles

### Spacing
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
```

### Container
- Max width: 1400px for data-heavy views
- Generous padding on sides
- Content should breathe

### Grid
- Use CSS Grid for complex layouts
- 12-column system
- Gap: `--space-4` to `--space-6`

---

## The "Gold Moment"

When a qualified creator WITH an email is found, this is THE moment. Design for it:

1. Row has subtle golden/green glow
2. Email cell has cyan accent
3. Slight animation on appear
4. This row should STAND OUT from everything else
5. User should feel: "Found one!"

---

## Anti-Patterns (NEVER DO)

1. ❌ Light/white backgrounds
2. ❌ Blue-purple gradients (AI slop)
3. ❌ Generic grays (#f3f4f6, #e5e7eb)
4. ❌ Rounded-full buttons (too playful)
5. ❌ Drop shadows (use borders/layers)
6. ❌ Decorative elements with no purpose
7. ❌ Color without meaning
8. ❌ Inter font for data (use monospace)
9. ❌ Static spinners (show real progress)
10. ❌ Generic success/error colors without context

---

## Implementation Notes

### Tailwind Config
Extend Tailwind with custom colors matching this system.

### CSS Variables
Define all colors as CSS variables for consistency.

### Component Library
Each component should be self-contained with these styles built in.

### Dark Mode
This IS dark mode. No light mode variant needed.

---

*This design system reflects the tool's purpose: a professional command center for hunting high-value creators. Every element should reinforce the feeling of power, precision, and reward.*
