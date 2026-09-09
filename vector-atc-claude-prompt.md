# Vector ATC — Airport Procedures, Charts & Map Visualization

## Context

We are building **Vector ATC Operations Dashboard**, a high-density, mission-critical desktop interface for virtual air traffic controllers.

The existing visual direction is already defined in `DESIGN.md` and must be preserved. The application uses a dark tactical aviation aesthetic, dense information layout, Inter/IBM Plex Mono typography, cyan/amber/emerald semantic accents, and a fixed multi-pane desktop layout.

The application should feel like a professional aviation operations tool, not a generic SaaS dashboard.

The existing design specification explicitly calls for:
- A three-column operational layout.
- A procedure browser on the left.
- A large central chart visualization area.
- A right operational/departure sidebar.
- Interactive chart pan/zoom.
- High information density and minimal whitespace.
- Monospaced typography for technical aviation data.

Reference: `DESIGN.md`.

`AGENTS.md` contains an important Next.js instruction: before writing code, inspect the relevant Next.js documentation inside `node_modules/next/dist/docs/` because this project may use a version with breaking changes. Follow those local docs rather than relying on memory.

---

# Product Goal

Build an **ATC helper application for flight simulation / virtual ATC** that lets controllers quickly:

1. Find an airport.
2. Browse its SIDs, STARs, approaches, transitions, and other procedures.
3. View the **original published aviation chart**.
4. View the same procedure **plotted directly on an interactive map**.
5. Explore departures and filter them by SID, transition, runway, destination, aircraft type, etc.
6. Move between the original chart and the geographic/vector representation with minimal clicks.

The key product concept is:

> **Original Chart + Interactive Procedure Map**

The controller should be able to choose between the authoritative chart representation and a simplified geographic representation of the procedure.

---

# Core User Experience

## Airport Search

The user should be able to search by:

- ICAO code
- Airport name
- Location

Examples:

- `SBGR`
- `EDDF`
- `KJFK`

Airport search should be fast and accessible from the global header.

When an airport is selected, show an airport context header containing:

- ICAO
- Airport name
- Coordinates
- Elevation
- Active/status indicator
- Pin/favorite action
- Quick actions

Follow the existing `DESIGN.md` airport context header pattern.

---

# Procedure Browser

The procedure browser should support:

- SID
- STAR
- APPROACH

Use tabs or segmented controls consistent with the existing design.

Each procedure row should expose concise but useful operational information.

Example:

```text
STAR
ELOKU 1A

Transitions:
ELOKU
GERTU
DORLU

Runways:
10L
10R
```

The user should be able to select a procedure and immediately see its representation in the center visualization area.

Procedure filters should be fast and compact.

---

# Procedure Details

When a SID or STAR is selected, show:

- Procedure name
- Procedure type
- Airport
- Transition(s)
- Runway association(s), when applicable
- Waypoints / fixes
- Relevant route segments
- Chart availability
- Map availability

Example:

```text
STAR · ELOKU 1A

Airport
SBGR

Transitions
● ELOKU
○ GERTU
○ DORLU

Runways
10L
10R

[ View Chart ]
[ Plot on Map ]
```

---

# Original Chart Viewer

The application must support viewing the **original published aviation chart** directly inside the application.

This is important because the geographic map should not replace the published chart.

The original chart may contain information that is difficult or inappropriate to reproduce on a simplified map, such as:

- Altitude restrictions
- Speed restrictions
- Frequencies
- Notes
- Procedure annotations
- Holding information
- Special instructions
- Other published operational details

Therefore, the original chart should remain available as a first-class view.

## Chart Viewer Requirements

Support:

- Zoom
- Pan
- Reset view
- Fullscreen
- Fit to screen
- Recent charts
- Quick switching between charts
- Smooth interaction

The existing design specifies a specialized chart canvas with a technical dot-grid environment, zoom controls, and fullscreen interaction. Preserve that visual language.

When possible, distinguish between:

```text
ORIGINAL CHART
```

and

```text
MAP VIEW
```

visually, so the controller always knows which representation is being viewed.

---

# Interactive Procedure Map

The second major feature is to plot the procedure directly on a geographic map.

Instead of only displaying a PDF/image, render the procedure as geographic geometry.

For example:

```text
             ELOKU
               ●
                \
                 \
               GERTU
                 ●
                  \
                   \
                  DORLU
                    ●
                     \
                      \
                   SBGR
                ┌─────────┐
                │  RWY    │
                └─────────┘
```

The actual implementation should use geographic coordinates rather than a static illustration.

## Map Layers

The map should be capable of rendering layers such as:

- Airport
- Runways
- Taxiways
- Waypoints / fixes
- Navaids
- SID
- STAR
- Approach
- Selected procedure
- Optional airspace information

Use toggles/controls that fit the existing dense tactical interface.

---

# Procedure Map Interaction

The user should be able to:

- Select a SID/STAR from the procedure browser.
- Automatically center the map on the procedure.
- Zoom to the complete procedure.
- Pan freely.
- Zoom in/out.
- Click individual fixes.
- Inspect waypoint/fix information.
- Highlight the selected route.
- Show different transitions.
- Compare procedure branches where appropriate.
- Hide/show map layers.

When a transition is selected, visually emphasize that specific branch.

Example:

```text
STAR: ELOKU 1A

Transition:
[ ELOKU ] [ GERTU ] [ DORLU ]

The selected transition should be visually highlighted
on the map while the remaining procedure can remain subdued.
```

---

# Chart ↔ Map Toggle

Make switching between representations extremely easy.

Preferred interaction:

```text
[ MAP ] [ CHART ]
```

or a similarly compact segmented control.

The same selected procedure must remain active when switching views.

Example:

```text
SBGR
STAR · ELOKU 1A

         [ MAP ] [ CHART ]

              ↓

       Same selected procedure
       in either representation
```

Do not make the user reopen or search for the procedure after switching views.

---

# Departure Explorer

The right operational sidebar should include a departure flow view based on the existing `DESIGN.md`.

Show aircraft such as:

```text
CALLSIGN     TYPE     SID       TRANSITION    RWY     STATUS

GLO1234      B738     ELOKU1A   ELOKU         10R     READY
TAM4567      A320     DORLU2B   DORLU         10L     TAXI
AZU8910      E195     GERTU3C   GERTU         10R     AIR
```

Useful filters:

- SID
- Transition
- Runway
- Destination
- Aircraft type
- Status

The main purpose is to quickly answer questions such as:

> "Which departures are using this transition?"

or:

> "Which aircraft are departing via this SID?"

or:

> "Show me all aircraft using runway 10R."

---

# Operational ATC Helper

Include lightweight tools that reduce repetitive controller work.

Possible features:

- Quick airport lookup
- Quick procedure lookup
- Recent airports
- Recent procedures
- Favorite airports
- Favorite procedures
- Quick access to charts
- Quick access to map
- Callsign search
- Departure filtering
- Operational notes

Do not turn the application into a generic productivity dashboard. Every feature should support fast ATC decision-making.

---

# Data Architecture

The application should be designed around structured aviation data rather than treating charts as the primary data model.

A conceptual procedure model could look like:

```ts
type Procedure = {
  airport: string;
  type: 'SID' | 'STAR' | 'APPROACH';
  name: string;

  transitions: Transition[];

  geometry?: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>;

  runways?: string[];
};

type Transition = {
  name: string;

  fixes: Fix[];

  geometry?: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>;
};

type Fix = {
  identifier: string;
  latitude: number;
  longitude: number;
  type?: string;
};
```

This is only a conceptual starting point. Adapt the implementation to the project's existing architecture and types rather than blindly introducing duplicate models.

---

# Potential Aviation Data Sources

Research and evaluate data sources before implementing a production data pipeline.

Potential sources/technologies to investigate include:

## ARINC 424

ARINC 424 is a standard for encoding aeronautical navigation data and is relevant for structured procedures such as SIDs, STARs and approaches.

Potential libraries/projects to evaluate:

- `@arinc424/core`
- `@arinc424/toolkit`
- MITRE Boogie / ARINC 424 tooling

The goal is to determine whether these can help parse procedure data and convert it into route/geometry suitable for map rendering.

Do not assume that an open-source parser means the underlying global aviation dataset is freely licensed.

## FAA CIFP

The FAA publishes the CIFP (Coded Instrument Flight Procedures), which can be useful for investigating structured procedure data, especially for the United States.

Evaluate:

- Data structure
- Update cycle
- Coverage
- Licensing
- Whether it is suitable for the intended use

## AIXM

Investigate AIXM as another structured aviation information format.

Especially evaluate its suitability for:

- Airports
- Runways
- Waypoints
- Procedures
- Geographic visualization

## Chart Providers

Potential providers/APIs to investigate for original published charts include services such as SkyLink and other aviation chart providers.

The important distinction is:

```text
STRUCTURED NAV DATA
        +
OFFICIAL/PUBLISHED CHARTS
```

A chart provider may be useful for the original chart viewer, while structured navigation data may drive the interactive map.

Do not hard-code or commit to a provider without evaluating API terms, licensing, coverage, update frequency, cost, and commercial usage rights.

---

# Recommended Technical Concept

A high-level architecture could be:

```text
                    ┌─────────────────────┐
                    │   Vector ATC UI     │
                    │  Next.js / React    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
         Procedure UI      Chart Viewer      Map View
              │                │                │
              │                │                │
              ▼                ▼                ▼
       Structured Data     PDF/Image       GeoJSON
              │                                 │
              └──────────────┬──────────────────┘
                             ▼
                     Aviation Data Layer
                             │
                 ┌───────────┴───────────┐
                 │                       │
            ARINC/AIXM              Chart Provider
                 │                       │
                 ▼                       ▼
          SID/STAR/APP               Original Chart
```

The exact stack should follow the existing repository conventions.

---

# Map Technology

Evaluate a modern map renderer capable of handling:

- Vector geometries
- GeoJSON
- Smooth pan
- Smooth zoom
- Layer toggles
- Clickable geographic features
- Dark aviation-style basemap
- Custom styling

Potential technologies to investigate:

- MapLibre GL JS
- Mapbox GL JS
- OpenLayers

Prefer an implementation that allows us to keep ownership of the procedure visualization layer and supports custom styling.

The map should visually integrate into the existing `DESIGN.md` dark tactical environment.

---

# UI Requirements

Preserve the current Vector design system.

## Colors

Use the established palette:

```text
Background Primary:   #080d13
Background Secondary: #0a1017
Background Tertiary:  #0b1118

Cyan:    #22d3ee
Amber:   #fbbf24
Emerald: #34d399

Text Primary:   #e2e8f0
Text Secondary: #94a3b8
Text Muted:     #475569

Border:
rgba(255, 255, 255, 0.07)
```

Cyan should represent active selections and primary interactions.

Amber should represent warnings/status conditions.

Emerald should represent active/success/airborne/network states.

## Typography

Use:

```text
Inter
IBM Plex Mono
```

Use IBM Plex Mono for:

- Callsigns
- Frequencies
- Coordinates
- Altitudes
- Transponder codes
- Technical aviation data

Use Inter for navigation and descriptive UI text.

## Layout

Preserve the full-screen, fixed-height operational layout.

The intended structure remains:

```text
┌───────────────┬─────────────────────────────────────┬──────────────┐
│               │                                     │              │
│    Sidebar    │        Procedure / Chart / Map      │ Departures   │
│               │                                     │              │
│               │                                     │              │
│               │                                     │              │
└───────────────┴─────────────────────────────────────┴──────────────┘
```

Do not introduce unnecessary scrolling or large empty areas.

The app should prioritize information density.

---

# Interaction Principles

The application is intended to be used during live ATC sessions.

Therefore:

- Minimize clicks.
- Avoid unnecessary modal dialogs.
- Preserve selection state.
- Make search extremely fast.
- Keep important information visible.
- Make active states obvious.
- Keep controls predictable.
- Prefer keyboard-friendly interactions where practical.
- Never sacrifice readability for visual decoration.

Use approximately 150ms transitions for ordinary UI interactions, matching the existing design specification.

---

# Important Product Distinction

Do not treat the interactive map as merely a decorative visualization.

The map is a second operational representation of the procedure.

The two primary modes are:

```text
CHART MODE
The published/original chart with all of its operational annotations.

MAP MODE
A clean geographic representation of the procedure, optimized for spatial understanding and interaction.
```

Both should be useful independently.

---

# Suggested Initial Screen

When an airport is selected, the central workspace could look like:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ SBGR · São Paulo/Guarulhos                         ACTIVE            │
│ Coordinates · Elevation                           [Pin] [Briefing]  │
├───────────────────┬──────────────────────────────────────┬───────────┤
│ PROCEDURES        │                                      │ DEPARTURES│
│                   │                                      │           │
│ [SID][STAR][APP]  │          MAP / CHART VIEW            │  08 READY │
│                   │                                      │  04 TAXI  │
│ ELOKU 1A          │                                      │  12 AIR   │
│ DORLU 2B          │                                      │           │
│ GERTU 3C          │       Interactive visualization      │ GLO1234   │
│                   │                                      │ TAM4567   │
│                   │                                      │ AZU8910   │
│                   │                                      │           │
└───────────────────┴──────────────────────────────────────┴───────────┘
```

The exact implementation should respect the existing components and project structure.

---

# Implementation Strategy

Before implementing the full feature:

## Phase 1 — Inspect Existing Project

- Inspect the repository.
- Read `CLAUDE.md`, `AGENTS.md`, and `DESIGN.md`.
- Inspect the existing Next.js version.
- Read the relevant local Next.js documentation under `node_modules/next/dist/docs/` before writing code.
- Identify existing components, routing, styling, state management, and data models.
- Reuse existing components and conventions whenever possible.

Do not rewrite working architecture unnecessarily.

## Phase 2 — Build UI With Mock Data

Create a complete first-pass experience using realistic mock aviation data.

Include:

- Airport search
- Airport context
- SID/STAR/APP tabs
- Procedure list
- Procedure details
- Map/Chart toggle
- Interactive mock procedure geometry
- Chart viewer placeholder or test chart
- Departure list
- Filters

The goal is to validate the UX before connecting real aviation data.

## Phase 3 — Procedure Geometry

Introduce structured procedure geometry.

The system should be able to transform:

```text
Airport
→ Procedure
→ Transition
→ Fixes
→ Geographic line/path
```

into a renderable map representation.

## Phase 4 — Real Data Investigation

Evaluate real data sources.

Document:

- Coverage
- Licensing
- Update cadence
- API access
- Cost
- Commercial usage
- Data quality
- Geographic coverage

Do not implement a production integration before understanding these constraints.

## Phase 5 — Original Charts

Add the chart provider integration and build a reliable chart viewer.

Charts should remain clearly distinguished from the generated/vector map representation.

---

# Quality Bar

The resulting application should feel like:

> "A professional virtual ATC operations console."

Not:

> "A generic dashboard with an aviation theme."

Prioritize:

1. Operational speed
2. Information density
3. Clear aviation semantics
4. Accurate visual hierarchy
5. Excellent procedure navigation
6. Seamless map/chart switching
7. Fast departure filtering
8. Visual consistency with `DESIGN.md`

Avoid:

- Marketing-style hero sections
- Large decorative cards
- Excessive gradients
- Excessive rounded containers
- Huge typography
- Excessive whitespace
- Generic SaaS dashboard patterns
- Decorative animations that interfere with usability

---

# Definition of Done

The first implementation should allow a user to:

1. Search for an airport.
2. Open the airport context.
3. Select SID, STAR, or Approach.
4. Select a specific procedure.
5. Select a transition.
6. See the procedure plotted geographically.
7. Switch to the original chart view.
8. Zoom and pan the chart.
9. Return to the map while retaining the selected procedure.
10. Filter departures by SID/transition.
11. Identify aircraft using a specific procedure.
12. Use the entire workflow without leaving the application.

The implementation should look and behave consistently with `DESIGN.md`, respect the repository instructions in `AGENTS.md`, and follow the actual Next.js version's local documentation rather than assumptions from memory.
