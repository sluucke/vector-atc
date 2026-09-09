# IVAO Integration — Authentication, ATC Presence & Live Traffic

The application is already mostly implemented. Do NOT redesign the existing UI or rebuild unrelated parts.

The next major feature is integrating **IVAO** so the application can understand the logged-in controller's current IVAO position and automatically show the traffic relevant to that airport.

## Environment Variables

Add the following variables to `.env.local` / `.env` as appropriate for the existing project:

```env
IVAO_CLIENT_SECRET=
IVAO_CLIENT_ID=
IVAO_API_KEY=
IVAO_REDIRECT_URL=
```

Important:

- `IVAO_CLIENT_SECRET` must remain server-side only.
- `IVAO_API_KEY` must remain server-side only unless IVAO explicitly requires otherwise.
- Never expose secrets through client-side environment variables.
- Never commit real credentials.
- Follow the project's existing environment/configuration conventions.

---

# 1. IVAO OAuth Login

Implement OAuth2 authentication with IVAO.

The user should be able to connect their IVAO account from the application.

Expected flow:

```text
Vector ATC
    ↓
"Connect IVAO"
    ↓
IVAO OAuth authorization
    ↓
User logs into IVAO
    ↓
IVAO redirects to IVAO_REDIRECT_URL
    ↓
Backend exchanges authorization code for tokens
    ↓
Authenticated IVAO session
```

Use IVAO's current OAuth/OpenID configuration rather than hard-coding authorization/token URLs.

IVAO exposes OpenID configuration at:

```text
https://api.ivao.aero/.well-known/openid-configuration
```

Use the discovered endpoints from this configuration.

Do not assume endpoint names from memory.

---

# 2. Identify the Logged-In IVAO User

After authentication, obtain the authenticated user's IVAO identity / VID and relevant profile/session information.

The application should maintain a server-side representation similar to:

```ts
type IvaoSession = {
  vid: string;
  accessToken: string;
  expiresAt?: Date;
};
```

Adapt this to the project's existing authentication/session architecture.

Do not expose the raw access token to React components unless absolutely required.

---

# 3. Detect Whether the Controller Is Currently Online

After the user authenticates with IVAO, determine whether that user is currently connected to the IVAO network as an ATC controller.

The important distinction is:

```text
Logged into IVAO account
        ≠
Currently connected to the IVAO network
```

We need the second one.

Use IVAO's current API/data sources to determine the user's active ATC position.

The IVAO Data API exposes ATC position endpoints. Use the current API documentation to determine the best endpoint and authentication mechanism.

---

# 4. Detect the Airport / Tower Being Controlled

Once the logged-in user is online as ATC, determine the active callsign.

Examples:

```text
SBGR_TWR
EDDF_TWR
KJFK_TWR
```

The application should parse the active ATC position and associate it with an airport when applicable.

Conceptually:

```text
IVAO user
    ↓
Active network session
    ↓
ATC callsign
    ↓
SBGR_TWR
    ↓
Airport = SBGR
```

The user should not have to manually select the airport every time.

If the user is controlling an airport position, automatically switch the application context to that airport.

---

# 5. Determine the Exact ATC Position

Do not assume every callsign is a tower.

Support at least:

```text
TWR
GND
DEL
APP
DEP
CTR
FSS
```

Examples:

```text
SBGR_TWR → Tower
SBGR_GND → Ground
SBGR_DEL → Delivery
SBGR_APP → Approach
SBGR_DEP → Departure
```

If the user is connected to a position that does not map directly to a specific airport, keep the airport context manually selectable.

Example:

```text
Controller:
SBBS_CTR

Airport:
[ Select Airport ▼ ]
```

Do not force an incorrect airport context.

---

# 6. Live IVAO Traffic

Use IVAO's live network traffic data.

Investigate and use the current IVAO **Whazzup v2** data feed / API.

A current live traffic endpoint to investigate is:

```text
https://api.ivao.aero/v2/tracker/whazzup
```

Do not scrape Webeye.

Use the official IVAO API/data endpoints whenever possible.

The application should periodically refresh live traffic.

Avoid unnecessarily aggressive polling. Follow IVAO API limits/recommendations and use a sensible refresh interval.

---

# 7. Build a Local Traffic Model

Normalize IVAO flight data into an application-level model.

Conceptually:

```ts
type LiveFlight = {
  callsign: string;

  aircraftType?: string;
  aircraftIcao?: string;

  departure?: string;
  destination?: string;

  route?: string;

  latitude?: number;
  longitude?: number;

  altitude?: number;
  groundSpeed?: number;
  heading?: number;

  flightLevel?: number;

  status?: 'PARKED' | 'TAXI' | 'AIRBORNE' | 'UNKNOWN';

  sid?: string;
  star?: string;
  runway?: string;
  transition?: string;
};
```

Adapt this to the actual IVAO payload and existing application types.

Do not invent fields that IVAO does not provide.

---

# 8. Determine Relevant Airport Traffic

The key product feature is:

> Once the user is connected to an airport position, automatically identify aircraft that are relevant to that airport.

Split traffic into at least two operational groups.

## Arrivals

Aircraft that:

- have the selected airport as destination
- are currently arriving at the selected airport
- or are geographically approaching the airport, when enough information is available

Example:

```text
ARRIVALS

AZU1234   E195   SBGL → SBGR   ELOKU1A   ELOKU
TAM4567   A320   SBBR → SBGR   DORLU2B   DORLU
GLO8910   B738   SBRJ → SBGR   GERTU3C   GERTU
```

## Departures

Aircraft that:

- are parked at the selected airport
- are taxiing
- are preparing for departure
- have departed recently
- have the selected airport as origin

Example:

```text
DEPARTURES

GLO1234   B738   SBGR → SBRJ   SID ELOKU1A
TAM4567   A320   SBGR → SBGL   SID DORLU2B
AZU8910   E195   SBGR → SBBR   SID GERTU3C
```

---

# 9. Flight Plan Integration

Use IVAO flight plan data whenever available.

The application should extract useful information such as:

- Departure
- Destination
- Route
- SID
- STAR
- Transition
- Requested runway
- Aircraft
- Callsign
- Flight level
- Other available operational information

The important feature is associating live traffic with the procedures already shown in the application.

For example:

```text
STAR: ELOKU 1A

Transition ELOKU

Traffic:
GLO1234  ← using ELOKU
TAM4567  ← using ELOKU
AZU8910  ← using ELOKU
```

And:

```text
SID: DORLU 2B

Traffic:
TAM1234
GLO4567
```

If the live API does not explicitly expose SID/STAR/transition as structured fields, investigate how flight-plan route data can be parsed against the application's procedure database.

Do not fake procedure assignment.

Clearly distinguish:

```text
Confirmed
Inferred
Unknown
```

when necessary.

---

# 10. Traffic on the Procedure Map

This is where the IVAO integration connects with the existing central visualization.

When the user selects a procedure such as:

```text
STAR
ELOKU 1A
Transition: ELOKU
```

show relevant live aircraft on the map when their data allows it.

Conceptually:

```text
                   ELOKU
                     ●
                     │
                GLO1234 ✈
                     │
                     ● GERTU
                      \
                       \
                     TAM4567 ✈
                         \
                          \
                      ┌────────┐
                      │  SBGR  │
                      └────────┘
```

Aircraft markers should update as live traffic changes.

Use callsigns as labels where appropriate.

Clicking an aircraft should open a compact operational information panel.

---

# 11. Automatic Airport Context

Once IVAO connection is established:

### User connected as ATC

```text
● IVAO ONLINE

SBGR_TWR
São Paulo/Guarulhos Tower
118.000
```

Automatically make SBGR the active airport.

Then the dashboard should immediately load:

```text
SBGR
├── Procedures
├── Charts
├── Arrivals
└── Departures
```

### User not controlling an airport

For example:

```text
● IVAO ONLINE

User online
No airport ATC position detected

[ Select Airport ]
```

Do not force an incorrect airport context.

---

# 12. Live Status Indicator

Add a compact IVAO connection indicator to the existing header.

Possible states:

```text
● IVAO CONNECTED
● ATC ONLINE — SBGR_TWR
○ IVAO CONNECTED — NOT CONTROLLING
○ DISCONNECTED
⚠ CONNECTION ERROR
```

Keep the visual treatment consistent with the existing `DESIGN.md` semantic status system.

---

# 13. Polling / Refresh Strategy

Traffic is live data.

Do not fetch the entire network unnecessarily from multiple client components.

Prefer a centralized server-side data layer.

Conceptually:

```text
IVAO API
   ↓
Server
   ↓
Normalized traffic state
   ↓
React UI
   ├── Departures
   ├── Arrivals
   ├── Map
   └── Procedure associations
```

Use caching/de-duplication where appropriate.

Avoid one API request per aircraft.

Avoid one API request per component.

---

# 14. Security

The following must NEVER be exposed in the browser:

```text
IVAO_CLIENT_SECRET
IVAO_API_KEY
```

OAuth token handling should follow the existing server-side architecture.

The browser should communicate with our own backend/API routes.

Example:

```text
Browser
   ↓
/api/ivao/*
   ↓
Backend
   ↓
IVAO API
```

Do not call privileged IVAO endpoints directly from browser code when that would expose credentials.

---

# 15. UI Integration

Do not redesign the existing dashboard.

Integrate the IVAO data into the UI that already exists.

The current right-side operational panel should become live.

For example:

```text
DEPARTURES
────────────────────────

08 READY
04 TAXI
12 AIR

GLO1234   B738   ELOKU 1A
TAM4567   A320   DORLU 2B
AZU8910   E195   GERTU 3C
```

Add an arrivals section:

```text
ARRIVALS
────────────────────────

AZU1234   ELOKU1A   ELOKU
TAM4567   DORLU2B   DORLU
GLO8910   GERTU3C   GERTU
```

The user should be able to filter by:

```text
[ ALL ]
[ ARRIVALS ]
[ DEPARTURES ]

SID
STAR
TRANSITION
RUNWAY
DESTINATION
AIRCRAFT
```

---

# 16. Important Distinction: Live vs Planned

Clearly distinguish:

### Live network state

```text
Aircraft currently online
Current position
Current altitude
Current speed
Current controller
```

from:

### Flight-plan information

```text
Departure
Destination
Route
Planned SID
Planned STAR
```

and:

### Application inference

```text
Likely procedure
Likely transition
Likely arrival/departure phase
```

Never present inferred information as authoritative.

---

# 17. Implementation Order

Implement this incrementally.

### Step 1
Inspect the existing project and authentication architecture.

### Step 2
Read IVAO's current OpenID configuration and API documentation.

### Step 3
Add the environment variables:

```env
IVAO_CLIENT_SECRET=
IVAO_CLIENT_ID=
IVAO_API_KEY=
IVAO_REDIRECT_URL=
```

### Step 4
Implement IVAO OAuth login.

### Step 5
Implement authenticated user/session retrieval.

### Step 6
Detect the user's current IVAO network ATC position.

### Step 7
Resolve the ATC position to an airport when applicable.

### Step 8
Connect to IVAO live traffic / Whazzup data.

### Step 9
Normalize flights into the application's traffic model.

### Step 10
Separate arrivals and departures for the active airport.

### Step 11
Associate traffic with procedures when reliable data exists.

### Step 12
Render live traffic in the existing departures/arrivals UI.

### Step 13
Render relevant aircraft on the procedure map.

### Step 14
Add connection/error/loading states.

---

# Important Research Requirement

Before implementing, verify the current IVAO API rather than relying on assumptions.

Relevant IVAO API areas to investigate include:

- OAuth/OpenID
- Data API
- ATC positions
- Airport data
- Webeye
- Tracker / Whazzup

Use official IVAO API documentation to confirm:

- OAuth authorization and token endpoints
- Required scopes
- Authentication requirements
- ATC position schema
- Live traffic schema
- Flight-plan fields
- Refresh expectations
- API limits
- Permissions
- Whether `IVAO_API_KEY` is required for each endpoint

Do not rely on an assumed response schema from examples or third-party libraries. Verify the actual current API response before implementing.

---

# Definition of Done

A controller should be able to:

1. Click "Connect IVAO".
2. Authenticate with IVAO.
3. Return to Vector ATC authenticated.
4. See their IVAO account/session state.
5. Detect whether they are currently online as ATC.
6. Detect their active ATC callsign.
7. Automatically determine the controlled airport when possible.
8. Automatically load that airport in Vector.
9. Fetch live IVAO traffic.
10. Show arrivals and departures for that airport.
11. Filter the traffic.
12. Associate flights with SIDs/STARs/transitions when reliable.
13. Display relevant aircraft on the procedure map.
14. Keep the dashboard updated while the controller is online.
15. Handle disconnects, expired sessions, API errors, and unavailable data gracefully.

The end result should make Vector ATC feel like a **real-time IVAO controller companion**, not merely a static airport/procedure browser.
