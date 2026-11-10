---
version: alpha
name: Vector ATC Operations Dashboard
description: A high-density, mission-critical interface for air traffic controllers featuring procedure chart visualization, departure flow management, and airport operational data.
colors:
  background-primary: "#080d13"
  background-secondary: "#0a1017"
  background-tertiary: "#0b1118"
  accent-cyan: "#22d3ee"
  accent-amber: "#fbbf24"
  accent-emerald: "#34d399"
  text-primary: "#e2e8f0"
  text-secondary: "#94a3b8"
  text-muted: "#475569"
  border-subtle: "rgba(255, 255, 255, 0.07)"
typography:
  font-family-primary: "Inter, sans-serif"
  font-family-mono: "IBM Plex Mono, monospace"
  body-sm: "0.875rem"
  body-xs: "0.75rem"
  heading-lg: "1.5rem"
spacing:
  header-height: "4rem"
  sidebar-width: "15rem"
  sidebar-right-width: "18rem"
rounded:
  default: "0.5rem"
  full: "9999px"
components:
  nav-button: "{colors.background-secondary} with hover state {colors.background-subtle}"
  status-pill: "Mono font, semi-transparent background with high-contrast text"
  chart-canvas: "#131b20 background with radial dot grid pattern"
---

## Overview
The Vector ATC Operations Console is a professional-grade operational dashboard designed for high density and immediate information retrieval. The visual personality is "Dark Mode Tactical," utilizing a deep navy-black palette with vibrant cyan and amber accents that mirror real-world aviation instrumentation. The layout is a rigid, multi-pane configuration that maximizes screen real estate without sacrificing clarity. Typography leans heavily on monospaced fonts for technical data (coordinates, frequencies, callsigns) and clean sans-serif for UI navigation. The interface feels precise, technical, and low-latency.

## Colors
- **Surface Palette**: The UI uses tiered dark surfaces. Base background is `#080d13`, Sidebars/Header use `#0a1017`, and the main content area uses `#0b1118`.
- **Semantic Accents**:
  - **Cyan**: Primary action and active state color (e.g., `#22d3ee`). Used for current selections and navigation highlights.
  - **Amber**: Warning and status color (`#fbbf24`). Used for taxi status and notifications.
  - **Emerald**: Success/Active status color (`#34d399`). Used for airborne status and network connectivity.
- **Borders**: Highly subtle white overlays (`rgba(255, 255, 255, 0.07)`) create separation without adding visual weight.

## Typography
- **Primary (Inter)**: Used for all labels, navigation, and descriptions. Weights range from 400 (regular) to 600 (semi-bold).
- **Technical (IBM Plex Mono)**: Reserved for ATC-specific data like transponder codes, frequencies, coordinates, and altitudes. This provides the "instrumentation" feel.
- **Scale**: Small text is prioritized. Body text is 14px (`0.875rem`), with most secondary metadata at 12px (`0.75rem`).

## Layout
- **Global Container**: A fixed-height, full-screen layout (`h-screen`) with `overflow-hidden` to prevent native scrolling.
- **Sidebar (Left)**: Fixed 240px width (`w-60`). Contains primary navigation, workspace switcher, and user profile.
- **Header**: Fixed 64px height (`h-16`). Features a wide global search and technical frequency status.
- **Main Content**: A three-column split view:
  - Left Column: Procedure lists and filtering (approx 336px).
  - Center Column: Large-scale chart visualization area.
  - Right Column: Departure flow and operational notes (288px).

## Elevation & Depth
- **Flat Architecture**: The design avoids traditional shadows and depth. Contrast is achieved through color shifts and borders.
- **Floating Elements**: Tooltips and the chart info overlay use a slightly raised background (`#10161b`) with `shadow-xl` to stand out against the chart grid.

## Shapes
- **Radius**: Consistent 8px (`0.5rem`) rounding on buttons, input fields, and sidebar items.
- **Pills**: Navigation badges and status indicators use fully rounded edges or a smaller 4px radius for a more utilitarian look.

## Components
- **Navigation Items**: Interactive rows with 12px horizontal icons and text. Active states use a cyan tinted background (`rgba(34, 211, 238, 0.11)`).
- **Search Inputs**: Dark, recessed fields with internal icons and keyboard shortcut hints (`CMD+K`).
- **Procedure Rows**: Information-dense buttons showing a callsign, runway, and procedural metadata. Active state uses a cyan border-left or glow.
- **Flow Cards**: Status-specific cards (Queued/Taxi/Airborne) using mono-font numbers and semantic color coding.

## Page Sections

### Navigation Sidebar
Left-aligned vertical bar. Features the Vector logo in a cyan rounded box. Groups links into "Workspace" and "Controller Tools." The bottom section includes a network status panel and a user profile switcher.

### Global Header
Top horizontal bar. Contains a persistent search bar for airports and aircraft. The right side displays the current controller position (e.g., EDDF_GND) and the active frequency in high-contrast mono-font.

### Airport Context Header
Located at the top of the main area. Displays the ICAO code (EDDF), full name, coordinates, and elevation. Includes a green "ACTIVE" tag and action buttons for pinning or opening briefings.

### Procedure Browser
Vertical pane on the left side of the content area. Features a sub-filter for SID (Standard Instrument Departure), STAR (Arrival), and APP (Approach). Lists procedures with specific icons for direction (Up/Down/Landing).

### Chart Viewer
Large central area with a specialized chart canvas. It features a technical dot-grid background. Includes a toolbar for zoom controls (65% to 220%), reset, and fullscreen. The chart itself mimics paper charts with beige backgrounds and technical drawings.

### Operational Sidebar
Right-aligned pane. Top section shows numerical counts for the departure flow. The middle section is a live-updating list of aircraft callsigns with status tags (TAXI, READY, AIR). The bottom contains critical operational notes with colored warning bars.

## Motion & Interaction
- **Hover Transitions**: Standard 150ms transitions on all buttons and navigation items for background color and text color shifts.
- **Chart Interaction**: Interactive canvas supporting drag-to-pan and scroll-to-zoom. Cursor changes from `grab` to `grabbing` during interaction.
- **Tab Switching**: Underline animation for airport tabs (Procedures, Weather, etc.) using a cyan 2px border transition.

## Do's and Don'ts
- **Do**: Use monospaced fonts for any data that would be read off a radar screen.
- **Do**: Maintain a high-density layout; avoid excessive white space.
- **Don't**: Use vibrant gradients or organic shapes; keep everything strictly geometric and functional.
- **Don't**: Use bright white for backgrounds; stick to the deep navy/black palette to reduce eye strain.

## Accessibility
- **Focus States**: High-contrast rings (cyan) for keyboard navigation on inputs.
- **Iconography**: Every icon is paired with text or has a clear semantic purpose to ensure meaning is not lost.
- **Contrast**: Text primarily uses Slate-200/300 on dark backgrounds, meeting high contrast standards for readability in low-light environments.

## Assets
- **Tailwind Framework**: `https://cdn.tailwindcss.com`
- **Icon Library**: `https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js`
- **Fonts**: `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap`
- **External Connections**: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
