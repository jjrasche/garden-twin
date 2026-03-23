# Garden Deterrence Plan — 2026 Season

30x100ft garden, Grand Rapids MI (Zone 6a).
Fence operational by **April 10** (before first lettuce direct sow April 15).

---

## Electric Fence — $263

### Configuration

| Parameter | Value |
|-----------|-------|
| Charger | Plug-in, 0.1-0.25 joule (garden-scale) |
| Bottom wire | 6" above ground |
| Top wire | 30" above ground |
| Wire type | Polywire, 656ft roll |
| Ground | 1 × 3ft galvanized rod, 1 clamp |
| Posts | Trees w/ screw-in ring insulators + T-posts w/ snap-on insulators for gaps (see BOM note) |
| Perimeter | ~260ft |
| Operation | 24/7, weatherproof physical on/off switch (kid safety -- Charlie and Theo) |
| Power | House outlet via 50ft extension cord. **Must be GFCI-protected outlet.** GFCI covers all outdoor electrical: fence charger, Pi, cameras. |

### Bait

Fold 3" squares of aluminum foil over the top wire every 20ft. Smear peanut butter on the outside face. Deer and rabbits investigate with nose/tongue, get shocked on first contact, learn to avoid. Rebait every 2-3 weeks or after heavy rain.

### BOM

| Item | Qty | Unit Cost | Total |
|------|-----|----------|-------|
| Plug-in fence charger (0.1-0.25 joule) | 1 | $40 | $40 |
| Polywire, 656ft roll | 1 | $18 | $18 |
| T-posts, 4ft | 25 | $4 | $100 |
| T-post snap-on insulators (2 per post) | 50 | $0.50 | $25 |
| Screw-in ring insulators (for trees) | 6 | $0.50 | $3 |

> **Post count note**: BOM is priced for 25 T-posts + 6 tree anchors. Actual split depends on perimeter walk. Count usable trees first, then buy T-posts to fill gaps. If more trees are available, shift budget from T-posts to ring insulators.
| Ground rod, 3ft galvanized | 1 | $10 | $10 |
| Ground rod clamp | 1 | $3 | $3 |
| Gate handle w/ spring (insulated) | 1 | $5 | $5 |
| Fence voltage indicator lights | 3 | $7 | $21 |
| Weatherproof inline on/off switch | 1 | $8 | $8 |
| Insulated hookup wire (20ft) | 1 | $5 | $5 |
| T-post driver | 1 | $25 | $25 |
| **Fence subtotal** | | | **$263** |

### How It Works

- **Deer**: Don't jump fences they haven't tested. Peanut butter bait ensures first contact is on the nose (most sensitive). After 1-2 shocks, they avoid the area. 2-strand at 30" deters 90%+ of casual browsers.
- **Rabbits**: Bottom wire at 6" catches adults on contact. Very young rabbits (< 4 weeks) may pass under — live trapping handles this.
- **Groundhogs**: Bottom wire catches them effectively.
- **Voles**: Not addressed by fence. 6" bottom wire is above their surface travel profile. Primary vole defense is the cat. If vole damage appears (gnawed root crowns, surface tunnels through mulch), consider snap traps in covered stations along runs.

### Maintenance

- Weekly walk-the-line: clear vegetation touching wire (grounds it out), check charger, verify indicator lights, rebait as needed.

---

## Detection System — $175

Two ESP32-S3 camera/microphone nodes on a Raspberry Pi 4 hub.

### Architecture

- **Nodes** (2x ESP32-S3): Each has a NoIR camera (OV5640 90 degree) + IR LED for night vision + MEMS microphone (INMP441). Mounted in weatherproof enclosures at garden corners. Capture frames and audio, stream to Pi over WiFi.
- **Hub** (Raspberry Pi 4): Receives streams from both nodes. Runs YOLO object detection for animal species identification. Logs species, timestamp, behavior, and location. Audio stream captures vocalizations for secondary species ID.
- **Integration**: Detection events feed into the garden twin as Observations. Species, time, and behavior logged for pattern analysis. Over time: learn which animals visit, when, and what they target.

### BOM

| Item | Qty | Unit Cost | Total |
|------|-----|----------|-------|
| Freenove ESP32-S3-WROOM CAM | 2 | $12 | $24 |
| OV5640 90° NoIR camera module | 2 | $6 | $12 |
| IR LED board (850nm) | 2 | $3 | $6 |
| INMP441 I2S MEMS microphone | 2 | $1 | $2 |
| Weatherproof enclosure | 2 | $4 | $8 |
| Raspberry Pi 4 (4GB) | 1 | $55 | $55 |
| Pi power supply + case | 1 | $15 | $15 |
| Outdoor extension cord (50ft) | 1 | $20 | $20 |
| Weatherproof power strip | 1 | $12 | $12 |
| USB-C cables + adapters | 2 | $3 | $6 |
| Mounting hardware | — | — | $15 |
| **Detection subtotal** | | | **$175** |

---

## Supplemental Deterrence — $67

### BOM

| Item | Qty | Unit Cost | Total |
|------|-----|----------|-------|
| Havahart live trap (#1045) | 1 | $28 | $28 |
| EMT raptor perch (from existing stock) | 1 | $0 | $0 |
| Bird netting, woven UV-resistant (~14'×14') | 1 | $15 | $15 |
| Bamboo stakes for netting frame (tall) | 6 | $2 | $12 |
| Marigold + nasturtium seed packets | 4 | $3 | $12 |
| **Supplemental subtotal** | | | **$67** |

### Live Trapping — Rabbits

- Havahart #1045, bait with apple slices or fresh greens
- Place along fence perimeter at rabbit trails
- Check every 12 hours (MI legal requirement)
- Deploy from April 10 (fence live date), increase if damage observed despite fence
- Concentrate spring effort April-June when young rabbits disperse

### Backwoods Trapping — Squirrels

Deploy only if squirrel damage observed. Conibear 110 or rat-sized snap traps in enclosed boxes (prevents non-target catches). Check MDNR regulations for current licensing requirements.

### Bird Netting — Corn

Two threats to corn ears: birds and raccoons. Raccoons will defeat the electric fence. Birds land on draped netting and peck through the mesh openings.

Suspended bird netting on bamboo stake tent frame over corn rows. **Suspended, not draped.** The tent frame keeps netting taut and elevated so birds cannot land on it and raccoons cannot pull it down to reach ears.

### Companion Plants — Biological Deterrence (all direct sow mid-May)

Counts derived from effective radii in pest model (`src/core/data/pests.ts`).

- **Marigold** (34 plants): Direct sow. Visual confusion for cabbage moth (kale) and CPB (potato). 18" effective radius → 36" grid on kale/potato zone borders + 2 internal kale rows. Nematode suppression bonus in rhizosphere.
- **Nasturtium** (22 plants): Direct sow. Aphid trap crop + predator attraction. 72" effective radius. Single line at channelX - 84" (72" west of cherry tomatoes), 36-48" spacing along trellis.
- **Calendula** (10 plants): Direct sow. Predator attraction (ladybugs, hoverflies, lacewings, parasitic wasps). 120" radius — 4 anchor points cover entire garden.
- **Sweet Alyssum** (12 plants): Direct sow. General pollinator attraction. 2-3 clusters near tomato/corn.

---

## Total Cost

| Category | Cost |
|----------|------|
| Electric fence | $263 |
| Detection system | $175 |
| Supplemental | $67 |
| **Total** | **$505** |

---

## Timeline

| When | Action |
|------|--------|
| Late March | Order fence + detection components |
| April 5-7 | Install posts (trees + T-posts), run wire |
| April 8-10 | Connect charger, ground rod, indicator lights, switch, bait, test |
| April 10+ | Deploy live trap if rabbit activity observed |
| May 15 | Direct sow all companions: 34 marigold, 22 nasturtium, 10 calendula, 12 alyssum |
| August | Install bird netting over corn (before ears form) |
| As needed | Squirrel traps if damage observed |
| Weekly | Walk fence line: clear vegetation, check charger, rebait |
