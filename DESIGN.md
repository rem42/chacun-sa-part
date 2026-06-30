---
name: Chacun Sa Part
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444651'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#003120'
  on-tertiary: '#ffffff'
  tertiary-container: '#004a32'
  on-tertiary-container: '#4ac08f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-cerfa:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stat-lg:
    fontFamily: Space Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  stat-lg-mobile:
    fontFamily: Space Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  stat-md:
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

### Brand Personality & Core Purpose
This design system defines a civic, independent financial decision tool built to resolve one of the most sensitive friction points in French households: calculating an equitable, transparent split of household income tax between partners.

The emotional tone balances **institutional legitimacy** (impartial, precise, legal-grade security) with **empathic domestic calm** (pedagogical, non-judgmental, transparent). Rather than presenting taxation as an opaque administrative chore, the interface acts as a neutral arbiter: clarifying fiscal solidarity, demonstrating individual tax liabilities versus joint declaration advantages, and safeguarding household harmony.

### Design Movement: Neo-Institutional Civic Modernism
The visual philosophy combines the authoritative clarity of modern European civic services with the approachable warmth and ergonomic fluency of high-end SaaS tools. Key pillars include:
- **Flawless Financial Legibility**: Numeric primacy, strictly tabular figures (`font-variant-numeric: tabular-nums`), and immediate visual feedback when proportions shift.
- **Symmetric Saliency**: Balanced dual-column layouts giving equal visual weight and dignified treatment to both partners.
- **Calm Reassurance**: Generous whitespaces, crisp 1px structural dividing lines, absence of aggressive heavy shadows, and subtle micro-elevations that keep the cognitive load exceptionally low.

## Colors

### Color Hierarchy & Emotional Utility
- **Primary — Bleu Républicain Profond (`#1E3A8A`)**: An authoritative, deep navy evoking constitutional integrity, state data neutrality, and unshakeable confidentiality. Used for identity headers, primary action triggers, and active stepper milestones.
- **Secondary — Indigo Interactif (`#2563EB`)**: A vibrant, modern blue dedicated to dynamic affordances: hover triggers, active range sliders, split adjustment thumbs, and informational links.
- **Tertiary — Vert Émeraude Équité (`#059669`)**: A reassuring jewel emerald representing balance, equity, tax reductions, and positive restitution balances ("Reste à récupérer"). Accompanied by `#D1FAE5` as a soft highlight tint.
- **Neutral — Ardoise Sombre (`#0F172A`)**: A deep slate providing contrast (WCAG AAA) for monetary figures, legal labels, and primary data.

### Structural Foundations
- **Canvas (`#F8FAFC`)**: A chalk-slate tint preventing screen glare during complex fiscal simulation sessions.
- **Surface (`#FFFFFF`)**: Pure white cards and input surfaces establishing sharp delineation against the canvas.
- **Dividers & Outlines (`#E2E8F0` / `#CBD5E1`)**: Subtle 1px structural framing replacing dramatic Drop Shadows.
- **Critical Alert (`#DC2626` / `#FEE2E2`)**: Explicit notifications for missing required inputs or unbalanced deductions.

## Typography

### Typographic Intent
The typographic pairing reflects the dual nature of fiscal balance:
1. **Inter** powers human readability: calm, neutral, highly legible in dense informational hierarchies, legal footnotes, and step-by-step instructions.
2. **Space Mono** provides engineered certainty: applied strictly to official French Cerfa field badges (e.g., `1AJ`, `1BJ`, `7EA`, `8HW`) and currency amounts. This guarantees tabular consistency where numbers remain aligned regardless of length or digit shifts.

### Rules & Formatting
- **Financial Alignment**: All financial sums, tax rates, and percentages must render with `font-variant-numeric: tabular-nums` and align flush right in tables and data inputs.
- **French Spacing Conventions**: Euro symbols must be preceded by a non-breaking space (e.g., `1 250 €`).

## Layout & Spacing

### Layout Philosophy: The Symmetrical Civic Framework
The layout enforces visual parity between spouses/partners through a mirrored dual-column container system constrained to a maximum width of `1140px`:
- **Desktop (>= 1024px)**: Dual columns split exactly 50/50 for "Déclarant·e 1" and "Déclarant·e 2", bridging both sides via a central interactive slider mechanism.
- **Tablet (768px – 1023px)**: Responsive contraction of outer canvas margins (`1.5rem`), keeping columns side-by-side with condensed Cerfa label descriptors.
- **Mobile (< 768px)**: Stacked single-column hierarchy where "Déclarant·e 1" is positioned directly above "Déclarant·e 2", with the split slider converting into an interactive dual-handled full-width bar between the inputs.

### Spacing Rhythm
Built upon an atomic 4px/8px module:
- Micro gaps (`space-xs`, `space-sm`) structure input prefixes, badge padding, and Cerfa code pill margins.
- Standard gaps (`space-md`, `space-lg`) bind related field rows and provide spacious internal breathing room within cards.
- Macro spacing (`space-xl`, canvas margins) orchestrates the 3-step transition from declaration import to comparative split reconciliation.

## Elevation & Depth

### Tactile Clarity Over Visual Illusion
In fiscal and legal interfaces, exaggerated dropshadows and complex glassmorphic effects introduce sensory clutter and undermine institutional credibility. This design system adopts **Tonal Layering with Crisp Structural Outlines**:

- **Ground Level (Base Canvas)**: Flat `#F8FAFC`, absorbing ambient screen glare.
- **Layer 1 (Cards, Calculation Accordions, Modals)**: Pure `#FFFFFF` resting on `#F8FAFC`, demarcated by a 1px solid `#E2E8F0` hairline border and a feather-soft ambient contact shadow (`0px 1px 3px rgba(15, 23, 42, 0.04)`).
- **Layer 2 (Highlighted Settlement Boxes & Active Steps)**: Pure `#FFFFFF` framed by a 1.5px `#2563EB` (or `#059669` for surplus recovery) outline, supported by an ambient diffused elevation (`0px 4px 12px rgba(30, 58, 138, 0.06)`).
- **Focus & Tactile Active States**: Interactive elements (inputs, slider thumbs, button triggers) generate a 3px ring (`#2563EB` at 20% opacity) with zero offset, guaranteeing clear accessibility for keyboard and screen-magnifier navigation.

## Shapes

### Shape Language & Geometry
The system uses roundedness level `2` (8px base radius):
- **Base Components (Inputs, Buttons, Badges)**: `0.5rem` (8px) corner radius. This softens the austerity of institutional forms without veering into toy-like circularity.
- **Container Panes (Panels, Step Accordions, Result Summary Cards)**: `rounded-lg` (`1rem` / 16px), creating distinct boundary envelopes for each phase of calculation.
- **Cerfa Field Indicators & Status Pills**: `rounded-full` (`9999px`) for compact, pill-shaped markers (e.g., box code badges, tax rate indicators).
- **Ratio Sliders**: Pill-shaped tracks with circular, tactile thumbs designed for touch and cursor interaction.

## Components

### Buttons
- **Primary CTA ("Lancer la simulation", "Valider la répartition")**: Solid `#1E3A8A` background, white bold text, 8px radius, generous padding (`0.75rem 1.75rem`). Hover state shifts to `#2563EB` with a 150ms ease curve.
- **Secondary / Demo Action ("Tester avec un foyer exemple")**: White background, 1.5px border `#2563EB`, text `#2563EB`. Hover applies `#EFF6FF`.
- **Destructive / Reset ("Effacer cette ligne", "Réinitialiser")**: Transparent ghost button with text `#64748B`, transitioning to `#DC2626` and soft `#FEE2E2` on hover.

### Inputs & Fiscal Numeric Fields
- **Monetary Input (`NumberBox`)**: Right-aligned, tabular figures, prefixed or suffixed with the official `€` currency marker. Floating label positioned above. 1px `#CBD5E1` border in resting state; 1.5px `#2563EB` border on focus accompanied by the 3px accessibility ring.
- **Cerfa Code Badge**: Attached or nested monospaced badge (`Space Mono`, uppercase, e.g., `1AJ`, `2OP`), framed in a light slate container (`#F1F5F9`) with crisp `#CBD5E1` outlines.

### Ratio Slider & Allocation Lock
- **Proportional Split Slider**: Continuous dual-color horizontal track visually displaying the percentage split (e.g., 60% partner 1 in navy, 40% partner 2 in slate/cyan). Slider thumb includes an internal grab icon and real-time percentage tooltip.
- **Total Lock Toggle**: Micro-action icon button displaying an interactive padlock (`locked` / `unlocked`). When locked, adjusting partner 1's share automatically recomputes partner 2's share, maintaining the aggregate sum.

### Comparative Result Cards
- **Partner Split Panel**: Dual symmetric cards labeled "Déclarant·e 1" and "Déclarant·e 2".
- **Internal Breakdown Structure**:
    1. *Impôt en déclaration séparée* (neutral reference marker).
    2. *Impôt individualisé solidaire* (recommended equitable share).
    3. *Prélèvement à la source déjà réglé*.
    4. *Final Balance Hero Box*: Prominently displayed with oversized typography (`stat-lg`). Styled with emerald `#059669` / `#D1FAE5` for refunds due, or deep red `#DC2626` / `#FEE2E2` for remaining tax to pay.

### Stepper Accordion
- **3-Phase Linear Pipeline**:
    - *Étape 1: Import ou saisie des données fiscales*.
    - *Étape 2: Ajustement et ventilation des revenus communs*.
    - *Étape 3: Arbitrage du gain commun et restitution finale*.
- Accordion headers clearly convey step completion via filled status checkmarks and subtle step numbering. Inactive steps are muted and read-only until upstream milestones are fulfilled.
