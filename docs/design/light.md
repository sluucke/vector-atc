---
version: alpha
name: Vector ATC Operations Console Template
description: A high-density aviation operations interface designed for air traffic controllers, featuring complex data visualization, procedural chart rendering, and flight flow monitoring.
colors:
  primary: "#22d3ee"
  background: "#080d13"
  surface-dark: "#0a1017"
  surface-medium: "#0b1118"
  surface-light: "#0d141b"
  chart-canvas: "#131b20"
  text-primary: "#e2e8f0"
  text-secondary: "#94a3b8"
  text-muted: "#475569"
  accent-amber: "#fbbf24"
  accent-emerald: "#34d399"
  border: "rgba(255, 255, 255, 0.07)"
typography:
  fontFamily: "Inter, sans-serif"
  monoFont: "IBM Plex Mono, monospace"
  sizes:
    xs: "0.75rem"
    sm: "0.875rem"
    base: "1rem"
    xl: "1.5rem"
spacing:
  base: "4px"
  header-height: "64px"
  sidebar-width: "240px"
  inspector-width: "288px"
rounded:
  sm: "0.125rem"
  md: "0.375rem"
  lg: "0.5rem"
  full: "9999px"
components:
  button:
    active: "bg-cyan-400/[0.11] text-cyan-300"
    hover: "bg-white/[0.04]"
  input:
    background: "bg-white/[0.035]"
    border: "border-white/[0.09]"
    focus: "border-cyan-400/50 ring-cyan-400/10"
---

## Overview
Vector ATC is a specialized professional dashboard characterized by high information density, a dark-mode aesthetic (with a simulated high-contrast fallback), and a technical, mission-critical tone. The interface is divided into a three-column layout: a navigation sidebar, a central workspace containing airport procedures and a dynamic chart canvas, and a right-hand flight flow monitor. The visual language uses a deep navy and charcoal palette punctuated by neon cyan and amber functional accents. The layout is rigid and non-scrolling, utilizing fixed-height headers and overflow-hidden containers to mimic a hardware console environment.

## Colors
The palette is optimized for low-light environments typical of ATC towers.
- **Primary Surface**: `#080d13` (Main background) and `#0a1017` (Sidebar/Header).
- **Contrast Accents**: Cyan-400 (`#22d3ee`) for primary actions and active states; Amber-400 for alerts; Emerald-400 for connectivity and active status.
- **Typography**: Slate-100/200 for headings, Slate-500 for auxiliary labels, and custom high-visibility colors for specific flight states (e.g., Taxiing in Amber).
- **Borders**: Subtle white alphas (`0.07` to `0.1`) create separation without visual noise.

## Typography
- **Primary Interface**: Inter is used for all UI labels, utilizing `font-medium` and `tracking-tight` for high-density readability.
- **Technical Data**: IBM Plex Mono is used for callsigns, frequencies, coordinates, and chart annotations to ensure character distinction (e.g., 1 vs l, 0 vs O).
- **Headings**: Airport codes (e.g., EDDF) are rendered at `24px` (`text-2xl`) with semi-bold weighting.
- **Micro-labels**: Heavy use of `uppercase` with tracking values like `0.13em` for secondary category headers.

## Layout
The application employs a full-height flexbox structure (`h-screen`).
- **Global Sidebar**: Fixed `240px` (w-60) on the left.
- **Central Workspace**: Flexible width, containing a fixed header, sub-header for airport details, and a two-pane split (List vs. Canvas).
- **Flight Inspector**: Fixed `288px` (w-72) on the right for real-time traffic monitoring.
- **Constraint**: The interface requires a minimum width of `70rem` to prevent UI overlap.

## Elevation & Depth
Depth is communicated through color layering rather than drop shadows.
- **Base Layer**: Background `#080d13`.
- **Raised Surfaces**: Navigation and right sidebar use `#0a1017`.
- **Interactive Cards**: Inner cards in the flight flow use `bg-white/[0.035]` or subtle cyan tints.
- **Floating Elements**: Chart tooltips and legends use a slightly opaque background (`#10161b]/90`) with a `shadow-xl` to stand out against the canvas.

## Shapes
- **Interactive Elements**: Navigation items, inputs, and buttons use a `0.5rem` (rounded-lg) radius.
- **Status Tags**: Small status indicators (e.g., "ACTIVE", "GND") use a tighter `0.375rem` (rounded-md) or `0.125rem` (rounded) radius.
- **Avatars**: The user profile icon is fully circular (`rounded-full`).

## Components
- **Navigation Items**: Flex containers with `gap-3`, supporting active states with low-opacity cyan backgrounds and right-aligned badges.
- **Procedure Rows**: List items featuring a square icon indicator (colored by type: SID/Blue, STAR/Violet, APP/Amber), a bold title, and mono-spaced sub-text.
- **Flight Strips**: Compact cards with a top row for callsign/status and a bottom row for aircraft type/destination using `font-mono` for critical identifiers.
- **Chart Controls**: A horizontal button group in the header for zoom, reset, and fullscreen toggles.

## Page Sections

### Navigation Sidebar
- **Content**: Branding (Vector ATC), Workspace navigation, Controller Tools, and a bottom-aligned status/user area.
- **Interactions**: Click-to-select nav items with hover transitions.
- **Status Area**: Displays network connectivity with a live-pulsing emerald dot and a UTC timestamp.

### Global Header
- **Content**: Search bar with shortcut hint (⌘ K), notification bell, and current sector control info (EDDF_GND, 121.800 MHz).
- **Interaction**: Search input highlights on focus with a cyan glow.

### Airport Workspace
- **Header Section**: Displays airport code, city name, coordinates, and elevation. Includes "Pin" and "Open Briefing" action buttons.
- **Tab Bar**: Horizontal navigation for Procedures, Airport Info, Weather, and Traffic.
- **Procedure List**: A scrollable vertical column with search filtering and category buttons (SID/STAR/APP).

### Chart Canvas Area
- **Canvas Container**: A technical `#131b20` background with a radial dot grid (`1rem` size).
- **Rendered Content**: Vector-style drawing of departure routes, waypoints, DME arcs, and textual flight constraints using specific hex codes (`#e4e2d4` for the chart card).
- **Tools**: Overlay information boxes for chart metadata and user instructions (Drag to pan).

### Departure Flow (Right Sidebar)
- **Summary Stats**: A 3-column grid showing counts for Queued, Taxiing, and Airborne flights.
- **Flight Queue**: A vertical stack of flight strips showing real-time departures.
- **Operational Notes**: A bottom-fixed section for alerts (Amber border-left) and general info.

## Motion & Interaction
- **Canvas Interaction**: Click-and-drag panning and scroll-wheel zooming implemented via JavaScript on an HTML5 Canvas.
- **Transitions**: Navigation buttons and list items feature a standard `transition-colors` effect on hover.
- **Search Hotkey**: `Ctrl/Cmd + K` automatically focuses the global search input.
- **Tab Switching**: Active airport tabs are indicated by a `border-b-2` cyan transition.

## Do's and Don'ts
- **Do**: Use `IBM Plex Mono` for all numeric data and aircraft callsigns.
- **Do**: Maintain high contrast between status indicators (Amber/Emerald) and the dark background.
- **Don't**: Introduce vertical page scrolling; keep all panels within the fixed viewport height.
- **Don't**: Use standard sans-serif fonts for flight data, as it reduces legibility of technical codes.

## Accessibility
- **Color Contrast**: The design relies on high-contrast text against dark backgrounds. A fallback `style` block is present for light-mode simulation if forced by system preferences.
- **Visual Cues**: Statuses use both color and text (e.g., Emerald color + "ACTIVE" text) to assist color-blind users.
- **Keyboard Navigation**: Includes custom keyboard listener for search focus.

## Assets
1. other: https://cdn.tailwindcss.com
2. other: https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js
3. embed: https://fonts.googleapis.com
4. embed: https://fonts.gstatic.com
5. embed: https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=Inter:wght@400;500;600&amp;display=swap
