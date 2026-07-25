# Reunite — Smart Campus Lost & Found

> Post what you lost or found. The matching engine does the rest.
> No scrolling through dozens of posts — Reunite actively compares structured details and tells **both sides** the moment there's a strong match.

Reunite turns a chaotic campus notice board (WhatsApp groups, random Instagram stories, dusty lost-and-found desks) into a **smart recovery platform**. Instead of asking students to manually scroll and spot their belongings, a weighted matching engine compares every lost ticket against every found ticket and surfaces strong candidates automatically — with a score, a level, and a one-tap path to a private, in-app chat.

> **Vercel edition.** This build is tuned for serverless hosting on Vercel:
> PostgreSQL (Neon) instead of SQLite, HTTP polling instead of Socket.io, and
> client-side image thumbnails instead of filesystem uploads. The matching
> engine and all core features are identical to the original. See [DEPLOY.md](DEPLOY.md)
> for hosting steps. For the original local-dev version (SQLite + Socket.io), see the `main` branch.

---

## Why this exists

Most colleges already have WhatsApp groups or notice boards for lost & found. They all share the same problems:

- **Manual scanning** — students scroll through hundreds of unrelated posts hoping to spot theirs.
- **No structure** — "lost a black bottle near the library" is buried under "found a red wallet in the canteen."
- **Unsafe contact** — people post phone numbers, Instagram handles, WhatsApp links in public groups.
- **No follow-through** — once posted, there's no system that tells you "hey, someone just found something that matches yours."

Reunite fixes all four. The matching engine is the heart of the product — it's what turns a notice board into a recovery platform.

---

## How it works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Post LOST   │     │  Post FOUND  │     │  Matching Engine │
│  ticket      │     │  ticket      │────▶│  weighted score  │
└──────┬───────┘     └──────┬───────┘     └────────┬─────────┘
       │                    │                      │
       │           score ≥ 60 (POSSIBLE / STRONG / HIGHLY_LIKELY)
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│  Both owners get a notification + a "match" card appears     │
│  in their Matches tab (with the score + side-by-side compare)│
└──────────────────────────┬───────────────────────────────────┘
                           │
                   tap "Contact Finder/Owner"
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Private in-app chat opens (no phone, no Instagram, no WA)   │
│  → agree to meet at Security Office / Library Reception      │
│  → Faculty / Security / Lost & Found desk verifies ownership │
└──────────────────────────────────────────────────────────────┘
```

### The user flow

1. **Create a profile** — just name, roll number, department, year. No password, no phone number. (Simulated auth — see [Auth model](#auth-model-simulated).)
2. **Post a ticket** — LOST or FOUND. Structured fields: category, color, brand/identifying detail, size, location, date, optional photo, optional description.
3. **The engine runs instantly** — the moment you post, it's scored against every opposite-type ticket. Anything ≥ 60 is saved as a match and **both** owners get notified.
4. **Review matches** — the Matches tab shows side-by-side comparisons with a score badge (Possible / Strong / Highly likely).
5. **Open a private chat** — only after tapping "Contact Finder/Owner." Identity (name, department) is revealed **only inside the chat** — never on the public feed.
6. **Resolve** — once reunited, mark the ticket resolved; the match is closed.

### "Did you check here?"

When you're about to post a LOST ticket, Reunite suggests places to physically check first — **derived from your own historical data**. It tallies where similar items (same category) have been recovered in past FOUND tickets, and surfaces the top spots. Cold-start fallbacks (Security Office, Library Reception, Canteen Counter) are used until there's enough history. This can reduce unnecessary posts and makes the product feel genuinely helpful.

---

## The matching algorithm

This is the feature that separates Reunite from a plain notice board. It's a **weighted, field-by-field similarity scorer** — no AI, no embeddings, fully transparent and debuggable.

### Weights

| Feature   | Weight |
|-----------|--------|
| Category  | 40     |
| Brand     | 20     |
| Color     | 15     |
| Size      | 10     |
| Location  | 10     |
| Date      | 5      |
| **Total** | **100**|

Category dominates (it's the strongest signal — a phone isn't a wallet). Brand and color are the next best identifiers. Location and date are weak confirmers.

### Score levels

| Score      | Level           | Meaning                                  |
|------------|-----------------|------------------------------------------|
| 0 – 59     | *(ignored)*     | Not surfaced — too weak to be useful.    |
| 60 – 74    | POSSIBLE        | Worth a look.                            |
| 75 – 89    | STRONG          | Likely the same item.                    |
| 90 – 99    | HIGHLY_LIKELY   | Almost certainly the same item.          |
| 100        | —               | **Never returned.** Ownership always needs human verification by Faculty / Security / the Lost & Found desk. |

### How each field is compared

The engine lives in [`src/lib/matching.ts`](src/lib/matching.ts). Every field has its own similarity function returning `0..1`, multiplied by its weight:

- **Category** — exact match (with substring fallback), else loose keyword overlap × 0.6. Categories come from a constrained picklist, so this is usually 1 or 0.
- **Brand / identifying detail** — token-overlap (Jaccard-style) **with synonym expansion**. This is what makes `bottle ≈ water bottle`, `laptop charger ≈ charger`, `airpods ≈ earphones`. See the synonym groups below.
- **Color** — canonicalized into **color families** so `dark green ≈ green ≈ bottle ≈ teal`, `navy ≈ blue ≈ cobalt`, `burgundy ≈ red`. Unknown colors get small partial credit (0.3).
- **Size** — exact, or adjacent-size credit for S/M/L/XL (one step apart → 0.8). Unknown sizes get 0.3.
- **Location** — exact or substring (0.85), else keyword overlap × 0.7.
- **Date** — distance-based decay: same day = 1.0, ≤ 3 days = 0.8, ≤ 7 days = 0.5, ≤ 14 days = 0.25, else 0.

### Synonym groups (brand/keyword matching)

```
bottle ≈ waterbottle ≈ water
charger ≈ adapter ≈ laptopcharger ≈ phonecharger ≈ power
laptop ≈ notebook ≈ macbook
phone ≈ mobile ≈ smartphone ≈ iphone ≈ android
earphone ≈ earphones ≈ earbud ≈ earbuds ≈ airpod ≈ airpods ≈ headphone ≈ headphones
bag ≈ backpack ≈ rucksack ≈ satchel ≈ handbag
wallet ≈ purse
key ≈ keys ≈ keychain ≈ keyring
card ≈ id ≈ idcard ≈ identity ≈ aadhaar ≈ pan
book ≈ textbook ≈ notebook ≈ novel
watch ≈ smartwatch ≈ wristwatch
spectacles ≈ glasses ≈ sunglasses ≈ eyewear
```

### Color families

```
black:  black, charcoal, ebony, jet
white:  white, ivory, cream, offwhite, pearl
gray:   gray, grey, ash, slate, silver
red:    red, crimson, maroon, scarlet, burgundy, cherry, rose, wine
orange: orange, amber, rust, terracotta, peach, coral
yellow: yellow, gold, golden, mustard, lemon
green:  green, olive, emerald, mint, lime, forest, bottle, teal
blue:   blue, navy, cobalt, sky, azure, indigo, denim, royal, sapphire
purple: purple, violet, lavender, plum, magenta, lilac
pink:   pink, fuchsia, salmon, blush
brown:  brown, tan, beige, khaki, chocolate, coffee, mocha, camel
multicolor: multicolor, multi, rainbow, printed, pattern, floral, assorted
```

### When a new ticket is created

[`src/lib/matching-service.ts`](src/lib/matching-service.ts) runs the engine against the pool of all **ACTIVE, opposite-type tickets not owned by the same user**. For every result ≥ 60:

- a `Match` row is persisted (score + level),
- the **new ticket's owner** gets a notification ("*Strong match found!*"),
- the **opposite ticket's owner** also gets a notification ("*Someone may be looking for the item you found.*"),

so both sides learn about it without either having to refresh.

---

## Safety & privacy model

- **No public identity.** The Lost/Found feeds show only an avatar initial + color — never a name, roll number, or contact.
- **Identity is revealed only inside a private chat**, and only after both parties have a matched ticket and one taps "Contact."
- **No phone numbers, Instagram, WhatsApp.** Everything stays inside the app's chat.
- **Students never verify ownership themselves.** Reunite only *introduces* the two parties. Final verification belongs to **Faculty / the Security Office / the Lost & Found desk** — the app never claims an item is definitely yours.
- **Matches never score 100.** Even a 99% match is a *strong hint*, not proof.
- **Auto-expiry.** Tickets expire after 30 days (`expiresAt`), keeping the feed clean.

---

## Auth model (simulated)

This MVP uses a **simulated auth** — no OAuth, no passwords. The reason is documented in the product brief: Google login is the eventual plan (free, secure, no fake accounts), but for validating the core idea, a lighter touch is enough.

- You create a profile with **name, roll number, department, year**.
- The server stores a `User` row and identifies you via a session id.
- The session id is sent on **every API request as an `x-lf-uid` header** (stored in `localStorage`), with an `lf_uid` cookie as a fallback. The header path is essential when the app runs inside a cross-origin iframe (e.g. a preview panel), where `SameSite=Lax` cookies aren't attached to subrequests.
- Roll number is unique — re-entering it on a new device reloads the same profile.

To swap in real auth later, replace [`src/lib/auth.ts`](src/lib/auth.ts) and the `POST /api/auth` route with NextAuth.js + Google; the rest of the app is auth-agnostic.

---

## Tech stack

| Layer        | Choice                                              |
|--------------|-----------------------------------------------------|
| Framework    | **Next.js 16** (App Router, TypeScript)             |
| Styling      | **Tailwind CSS 4** + **shadcn/ui** (New York)       |
| Database     | **Prisma ORM** + **PostgreSQL** (Neon, serverless)  |
| Server state | **TanStack Query** (React Query)                    |
| Client state | **Zustand**                                         |
| Animations   | **Framer Motion**                                   |
| Real-time    | **HTTP polling** (TanStack Query refetchInterval) — Vercel serverless has no long-running sockets |
| Icons        | **Lucide**                                          |
| Runtime      | **Bun** (dev) / Vercel serverless (production)      |

> **Note:** This is the Vercel edition. Chat polls the API every 3 seconds instead of using Socket.io — messages persist and sync, just not instantly. Images are resized to small thumbnails in the browser and stored inline as JPEG data URLs (no external file storage needed). For hosting steps, see [DEPLOY.md](DEPLOY.md). For the original local-dev version (SQLite + Socket.io), see the `main` branch.

---

## Project structure

```
reunite/
├── prisma/
│   └── schema.prisma              # User, Ticket, Match, ChatRoom, Message, Notification
├── src/
│   ├── app/
│   │   ├── page.tsx               # Single route — view-switched via Zustand
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── auth/route.ts             # GET me / POST profile / DELETE logout
│   │       ├── tickets/route.ts          # GET list / POST create (+ run matching)
│   │       ├── tickets/[id]/route.ts     # GET detail + matches
│   │       ├── tickets/[id]/contact/     # POST open a chat room for a match
│   │       ├── tickets/[id]/resolve/     # PATCH mark resolved
│   │       ├── matches/route.ts          # GET my matches
│   │       ├── notifications/            # GET list / PATCH read
│   │       ├── chat/rooms/route.ts       # GET my chat rooms
│   │       ├── chat/[roomId]/messages/   # GET history / POST send
│   │       ├── suggestions/route.ts      # GET "Did you check here?" locations
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   └── reunite/              # App-specific views
│   │       ├── app-shell.tsx           # Header + bottom nav
│   │       ├── profile-setup.tsx       # First-login profile form
│   │       ├── home-view.tsx           # Lost / Found / Matches tabs
│   │       ├── ticket-form.tsx         # Create ticket + "Did you check here?"
│   │       ├── ticket-card.tsx         # Feed card
│   │       ├── ticket-detail-view.tsx  # Detail + matches list + Contact button
│   │       ├── match-card.tsx          # Side-by-side match comparison
│   │       ├── chats-view.tsx          # Chat room list
│   │       ├── chat-view.tsx           # Chat (HTTP polling, 3s refetch)
│   │       ├── notifications-view.tsx
│   │       ├── profile-view.tsx        # My profile + my tickets
│   │       └── shared.tsx              # Avatar, ScoreBadge, TypeBadge, helpers
│   ├── lib/
│   │   ├── matching.ts          # ⭐ The matching engine
│   │   ├── matching-service.ts  # Runs the engine on new tickets + notifies
│   │   ├── auth.ts              # Simulated auth (header + cookie)
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── api.ts               # Typed API client (frontend)
│   │   ├── store.ts             # Zustand store (view router + session)
│   │   ├── constants.ts         # Categories, locations, colors, sizes, depts
│   │   └── image.ts             # Client-side image thumbnailer (canvas → data URL)
│   └── hooks/
├── prisma/schema.prisma
├── vercel.json
├── DEPLOY.md
└── package.json
```

---

## Getting started (local)

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node 20+
- A **PostgreSQL** database. The easiest free option is [Neon](https://neon.tech) (serverless Postgres — also what the Vercel deploy uses). Vercel Postgres / Supabase / a local Postgres also work.

### Install & run

```bash
bun install

# Copy the example env and paste your Neon DATABASE_URL
cp .env.example .env
# edit .env → DATABASE_URL="postgresql://...?sslmode=require"

# Create the tables in Postgres
bun run db:push

# Start the Next.js app (port 3000)
bun run dev
```

> **No chat-service mini-service needed.** This edition polls the chat API every 3 seconds via TanStack Query's `refetchInterval` — no separate Socket.io service to start. Messages persist via the API and sync within ~3s. (For real-time sockets, use the local-dev version on the `main` branch.)

Open `http://localhost:3000`, create a profile, and post a lost + found ticket to see the matching engine in action.

### Environment

A `.env` file with:

```
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/reunite?sslmode=require"
```

See `.env.example`. No other secrets are needed for the MVP.

### Scripts

| Script             | What it does                              |
|--------------------|-------------------------------------------|
| `bun run dev`      | Start Next.js dev server (port 3000)      |
| `bun run lint`     | Run ESLint                                |
| `bun run db:push`  | Push the Prisma schema to Postgres        |
| `bun run db:studio`| Open Prisma Studio to browse data         |

---

## API reference

| Method | Endpoint                          | Purpose                                  |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/api/auth`                       | Current user (or null)                   |
| POST   | `/api/auth`                       | Create / load profile by roll number     |
| DELETE | `/api/auth`                       | Logout                                   |
| GET    | `/api/tickets?type=&mine=`        | List tickets                             |
| POST   | `/api/tickets`                    | Create ticket + run matching engine      |
| GET    | `/api/tickets/[id]`               | Ticket detail + its matches              |
| POST   | `/api/tickets/[id]/contact`       | Open a chat room for a match             |
| PATCH  | `/api/tickets/[id]/resolve`       | Mark resolved                            |
| GET    | `/api/matches`                    | My matches (both sides)                  |
| GET    | `/api/notifications`              | My notifications                         |
| PATCH  | `/api/notifications/[id]/read`    | Mark one read                            |
| GET    | `/api/chat/rooms`                 | My chat rooms                            |
| GET    | `/api/chat/[roomId]/messages`     | Chat history                             |
| POST   | `/api/chat/[roomId]/messages`     | Send message (persisted)                 |
| GET    | `/api/suggestions?category=&location=` | "Did you check here?" locations     |

---

## Roadmap (V2+)

The MVP intentionally validates **one thing**: will students post lost/found items when matching is smart? Everything else is deferred:

- **Faculty / Security dashboard** — pending claims, successful returns, active tickets, daily stats.
- **Heatmaps** — top loss/recovery locations (Library, Ground, Lab, Canteen).
- **Analytics** — most-lost item, recovery rate, average recovery time, weekly/monthly reports.
- **Badges** — Bronze/Silver/Gold Finder, Campus Hero (no cash rewards).
- **Real auth** — Google login via NextAuth, optionally restricted to official college emails.
- **Smarter matching** — more synonym groups, fuzzy brand matching, photo similarity (still without heavy AI).

---

## Product philosophy

> *The matching engine is the heart of the product — not the posting system.*

Many colleges already have WhatsApp groups for lost & found. Reunite's advantage isn't "another place to post." It's that users don't have to manually scroll. The system **actively compares structured information** and tells both sides when there's a strong match. That's what turns a notice board into a recovery platform — and it's the feature to emphasize in any pitch or portfolio piece.

---

## License

MIT — built as a portfolio / hackathon project. Use it, fork it, ship it.
