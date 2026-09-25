---
name: Clinical Clarity
colors:
  surface: '#f9f9ff'
  surface-dim: '#d6dae8'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edfc'
  surface-container-high: '#e4e8f6'
  surface-container-highest: '#dee2f0'
  on-surface: '#171c26'
  on-surface-variant: '#434655'
  inverse-surface: '#2b303b'
  inverse-on-surface: '#ecf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#3b5e97'
  on-secondary: '#ffffff'
  secondary-container: '#9dbffe'
  on-secondary-container: '#274d84'
  tertiary: '#0051b1'
  on-tertiary: '#ffffff'
  tertiary-container: '#0f69dc'
  on-tertiary-container: '#edf0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aac7ff'
  on-secondary-fixed: '#001b3e'
  on-secondary-fixed-variant: '#20467e'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f9f9ff'
  on-background: '#171c26'
  surface-variant: '#dee2f0'
typography:
  display-vital:
    fontFamily: Inter
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 3.75rem
    letterSpacing: -0.025em
  display-vital-mobile:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  provenance-tag:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system delivers a calm, approachable, and medical-grade interface tailored for blood pressure and blood glucose monitoring. The experience bridges three distinct user cohorts:
- **Patients**: Requiring low-cognitive-load layouts, large typography, high touch targets, and reassurance without alarming diagnostics.
- **ASHA Workers**: Operating in dynamic, field-based conditions on mobile viewports, requiring rapid logging, clear operational cues, and legible validation steps.
- **Doctors**: Demanding dense chronological charts, instant differentiation between verified and simulated vitals, and structured longitudinal trends.

The design movement combines **Modern Corporate Clarity** with **Restrained Functional Minimalism**. Visual hierarchy is communicated through calm tonal depth, deliberate whitespace, and structured informational cards. High contrast ensures readability in variable ambient light, while gentle blue undertones reduce physiological anxiety often associated with clinical data tracking.

## Colors

The palette establishes clinical authority while maintaining a soft, reassuring atmosphere. The canvas is bathed in a pale, atmospheric blue tint rather than stark hospital white, setting an immediate soothing tone.

### Palette Architecture
- **Page Background (`#F5F9FF`)**: Soft, cool canvas tint preventing eye fatigue during extended clinical reviews.
- **Surface Elevation (`#FFFFFF`)**: Pure white reserved strictly for elevated interactive cards, data tables, and input containers.
- **Brand & Action Core**:
  - `Primary Blue (#2563EB)`: Interactive controls, primary buttons, active state indicators.
  - `Deep Blue (#153E75)`: Structural section heads, table headers, and anchor navigation.
  - `Navy (#14243B)`: High-emphasis titles, critical modal headers, and clinical metric figures.
  - `Medium Blue (#3B82F6)`: Focus rings, active tabs, secondary links, and selected toggles.
  - `Light Blue (#93C5FD)`: Passive chart grids, divider accents, and inactive step progress bars.
  - `Pale Blue (#EAF3FF)`: Subtle button hover states, row highlights, and informational message containers.
- **Typography & Neutral Foundation**:
  - `Primary Text (#171C26)`: Crisp, near-black tone passing AAA contrast over both `#F5F9FF` and `#FFFFFF`.
  - `Secondary Text (#64748B)`: Neutral slate for labels, metadata, secondary instructions, and explicit unit markers.
  - `Surface Borders (#DCE6F2)`: Muted structural lines maintaining container boundaries without visual noise.

### Status System
Color alone must never convey health conditions or triage states. Status indicators must always be paired with explicit typography and semantic icons:
- **Normal / Confirmed**: Text `#15803D`, Surface `#F0FDF4`, Border `#BBF7D0`. Applied to reference cuff records and within-range biomarkers.
- **Elevated / Warning / Experimental**: Text `#B45309`, Surface `#FFFBEB`, Border `#FDE68A`. Applied to borderline metrics, optical/experimental estimates, and simulated test records.
- **Critical / Destructive**: Text `#B91C1C`, Surface `#FEF2F2`, Border `#FECACA`. Applied to urgent physician referral thresholds, severe hypo/hyperglycemia warnings, and irreversible system actions.

## Typography

The type system relies on **Inter** to ensure unambiguous optical rendering of decimal points, numerals, and clinical abbreviations across low-cost mobile screens and high-resolution clinical monitors.

### Typographic Rules for Health Metrics
- **Metric Pairing**: Vital readouts (`display-vital` or `display-vital-mobile`) must be immediately followed by explicit unit descriptors (`mmHg`, `mg/dL`) set in `body-sm` or `label-md` using `#64748B`. Never render raw vital numbers without explicit units.
- **Tabular Numerals**: Numerical vitals in tables, historical trend listings, and log forms must enforce font feature settings (`tnum` / tabular figures) to prevent horizontal shifting during live data input.
- **Provenance Tags**: Provenance badges (`provenance-tag`) use uppercase styling, tight sizing, and letter spacing to instantly identify data origins without competing with actual patient metrics.

## Layout & Spacing

The layout philosophy follows a structured, content-focused responsive grid that prioritizes situational ergonomics:
- **Mobile (ASHA Field & Patient Mobile Web, &lt;768px)**: Single-column flow with `1rem` (16px) margins. Touch targets maintain a strict minimum height of 48px to accommodate one-handed operation in field environments. Form fields and metric cards stack vertically.
- **Tablet (Field Intake & Ward Tablets, 768px - 1023px)**: 8-column layout with `1.5rem` gutters. Splits clinical review into a 5-column patient history stream and a 3-column quick-action/provenance inspection sidebar.
- **Desktop (Physician Dashboard, &ge;1024px)**: 12-column grid capped at a maximum width of `1440px`. Accommodates side-by-side comparative trends (Blood Pressure vs. Glucose), historical telemetry logs, and diagnostic note panels.

### Spacing Rhythm
- **Internal Card Padding**: Standard vital cards employ `space-lg` (24px) padding. Tightly grouped measurement steps and provenance callouts employ `space-md` (16px).
- **Element Separations**: Form input label to input field gap is strictly `space-xs` (8px). Gap between grouped vital fields (e.g., Systolic and Diastolic inputs) is `space-sm` (12px).

## Elevation & Depth

Visual hierarchy avoids heavy drop shadows and dramatic skeuomorphism. Instead, the interface utilizes crisp **low-contrast borders (`#DCE6F2`)** paired with soft, atmospheric, blue-tinted ambient shadows to achieve calm dimensional clarity.

### Elevation Levels
- **Level 0 (Canvas Base)**: `#F5F9FF`. Flat canvas surface.
- **Level 1 (Clinical Cards & Data Surfaces)**: `#FFFFFF` with border `1px solid #DCE6F2` and shadow `0px 1px 3px rgba(20, 36, 59, 0.04), 0px 4px 12px rgba(20, 36, 59, 0.02)`. Used for daily metric summaries, trend charts, and record rows.
- **Level 2 (Interactive Floating Elements & Dropdowns)**: `#FFFFFF` with border `1px solid #DCE6F2` and shadow `0px 4px 6px -1px rgba(20, 36, 59, 0.06), 0px 10px 15px -3px rgba(20, 36, 59, 0.04)`. Used for date-range pickers, role switchers, and provenance explanation tooltips.
- **Level 3 (Modals & Emergency Guidance Dialogs)**: `#FFFFFF` with shadow `0px 20px 25px -5px rgba(20, 36, 59, 0.08), 0px 8px 10px -6px rgba(20, 36, 59, 0.04)`. Accompanied by a semi-transparent backdrop overlay of `rgba(20, 36, 59, 0.4)`.

## Shapes

The design uses balanced, rounded corners (Token `2`) to project an approachable, human-centered feel while maintaining clinical discipline.

### Geometry Hierarchy
- **Standard Cards & Modal Dialogs**: `1rem` (16px) radius (`rounded-lg`). Softens data presentation and visually separates multi-metric containers.
- **Input Fields, Action Buttons, and Alerts**: `0.5rem` (8px) radius (Base `roundedness`). Maintains structural precision for form alignment.
- **Status Badges, Stepper Indicators, and Provenance Chips**: `9999px` (Pill). Signals non-interactive contextual markers or discrete micro-buttons clearly distinct from rectilinearly bounded form inputs.

## Components

### Buttons
- **Primary Action**: Background `#2563EB`, text `#FFFFFF`, radius `0.5rem`, minimum height `48px` (touch-first). Hover: `#153E75`. Active: `#14243B`. Focus: `0 0 0 3px rgba(59, 130, 246, 0.4)`.
- **Secondary Action**: Background `#FFFFFF`, text `#153E75`, border `1px solid #DCE6F2`. Hover: `#EAF3FF` with border `#93C5FD`.
- **Subtle / Ghost**: Background transparent, text `#2563EB`. Hover: `#EAF3FF`.

### Provenance Chips
Chips categorize reading sources directly beside numerical vitals to guarantee clinical safety:
- **Reference Cuff**: Background `#F0FDF4`, border `1px solid #BBF7D0`, text `#15803D`.
- **ASHA-Assisted**: Background `#EAF3FF`, border `1px solid #93C5FD`, text `#153E75`.
- **Experimental BP Estimate**: Background `#FFFBEB`, border `1px solid #FDE68A`, text `#B45309`.
- **Simulated Data**: Background `#F1F5F9`, border `1px solid #CBD5E1`, text `#475569`.
All chips carry an explicit icon (e.g., checkmark, shield, beaker, or bot icon) preceding the text.

### Metric Input Fields
- **Container**: White background, `1px solid #DCE6F2`, `0.5rem` radius, `48px` height.
- **Focused State**: Border `#2563EB` with `0 0 0 3px rgba(37, 99, 235, 0.15)`.
- **Compound Suffix**: Permanent trailing unit badge (e.g., `mmHg` or `mg/dL`) rendered in `#64748B` with a subtle vertical divider inside the field boundary.
- **Validation**: When inputs fall outside human physiological limits (e.g., Systolic &lt; 40 or &gt; 300), border transitions to `#B91C1C` with an immediate contextual helper text below.

### Guided Check Step Indicators
- Designed for field screening workflows (e.g., "Step 1: Patient Rested for 5 Mins", "Step 2: Cuff Placement", "Step 3: Recording").
- **Completed Step**: Filled circle `#2563EB` containing a white checkmark, connecting bar `#2563EB`.
- **Active Step**: Ring with white center, border `3px solid #2563EB`, text `#14243B` bold.
- **Pending Step**: Inactive circle `#EAF3FF` with border `#93C5FD`, text `#64748B`.

### Vital Cards
- Pure white container with `1rem` radius and `1px solid #DCE6F2`.
- Top header row: Metric label (`Systolic / Diastolic` or `Fasting Blood Glucose`) paired with the Provenance Chip and observation timestamp.
- Center section: Primary metric figure in `display-vital` paired with explicit unit text.
- Footer row: Status indicator banner (e.g., green-tinted or amber-tinted badge) with clear plain-language summary (e.g., "Optimal Range - No Immediate Action Needed").