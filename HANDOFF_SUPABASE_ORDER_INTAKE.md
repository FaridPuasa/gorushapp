# Handoff: order intake writing directly to Supabase

Context for a fresh Claude Code session working on this app (`gorushapp`). This
app is being built to replace the current Webflow → Make → MongoDB order
intake pipeline for a specific set of product types. The other app,
`grfmxstatusupdate` (same author, separate Heroku app + codebase), is mid-way
through migrating from MongoDB Atlas to Supabase Postgres. This document is
the handoff of everything this app needs to know to write orders directly
into that same Supabase Postgres database correctly.

## The one hard blocker: sequencing with `grfmxstatusupdate`'s migration

**Do not go live with "save directly to Supabase" until `grfmxstatusupdate`
has cut its own reads over to Postgres (its "Phase 7").** As of this
writing, `grfmxstatusupdate` still reads from MongoDB for everything —
order dashboards, warehouse workflows, and critically, **processing Detrack
webhook callbacks** (status updates, POD capture, GDEX sync all look up the
order by `doTrackingNumber` in Mongo).

If this app starts inserting orders straight into Supabase and skips Mongo
entirely before that cutover happens, those orders will be **completely
invisible to `grfmxstatusupdate`**. Concretely: Detrack sends a
status-update webhook for one of these orders → `grfmxstatusupdate` looks it
up in Mongo → finds nothing → the whole downstream lifecycle (status
tracking, POD, GDEX sync, warehouse dashboards) silently breaks for every
order this app creates.

If you're picking this up and don't know whether that cutover has happened
yet, ask the user directly before wiring this up for production traffic.

## The 5 product types this covers

`pharmacymoh`, `pharmacyjpmc`, `pharmacyphc`, `localdelivery`, `cbsl` — these
are the ones currently flowing through Webflow → Make → Mongo that this app
is meant to replace intake for.

## Tracking number generation — reuse the existing Postgres sequences

`grfmxstatusupdate` already replaced Mongo's old race-prone counter-scan
with real Postgres sequences (created in its Phase 1, see its
`prisma/manual-followups.sql`). **Reuse these same sequences** — don't
invent new ones — so numbering stays gap-free and globally unique across
both apps:

| Product(s) | Sequence name (schema `gr_dms`) | Prefix |
|---|---|---|
| `pharmacymoh` | `order_seq_pharmacy` | `MH` |
| `pharmacyjpmc` | `order_seq_pharmacy` (**same sequence, shared**) | `JP` |
| `pharmacyphc` | `order_seq_pharmacy` (**same sequence, shared**) | `PN` |
| `localdelivery` | `order_seq_localdelivery` | `LD` |
| `cbsl` | `order_seq_cbsl` | `CB` |

Important: all three pharmacy sub-types share **one** sequence
(`order_seq_pharmacy`) — they are not three separate counters. This is the
existing, established behavior (see `data/orderCounter.js` and
`index.js`'s `handleOrderChange()` in `grfmxstatusupdate`) — matching it
keeps the numbering pattern consistent with what's already been generated
for these products historically.

Tracking number format, exactly as `grfmxstatusupdate` generates it
(`generateTracker()` in its `index.js`):

```
suffix + zeroPaddedSequence(8 digits) + prefix
```

Suffix per product family: pharmacy family → `GR2`, `localdelivery` →
`GR3`, `cbsl` → `GR5`. Example: sequence `56023` for a `pharmacymoh` order
→ `GR200056023MH`.

To generate one, in the same transaction as the insert (or immediately
before it):

```sql
SELECT nextval('gr_dms.order_seq_pharmacy');  -- or order_seq_localdelivery / order_seq_cbsl
```

Then format as above. Do this as one atomic step in this app — no need to
replicate the old two-phase "insert without tracking number, then a
separate reactive process fills it in later" dance that Make/Mongo needed.
That existed only because Make's Webflow trigger didn't have tracking-number
logic built in; this app does, so generate it inline and insert once.

## Field shape — keep it compatible with what `grfmxstatusupdate` reads later

Once `grfmxstatusupdate` is reading from Postgres (post-cutover), it needs
to find these orders in a shape it recognizes. Cross-check the `Order`
model in `grfmxstatusupdate`'s `prisma/schema.prisma` (schema `gr_dms`,
table `orders`) before finalizing your insert — especially:

- `product`, `doTrackingNumber`, `currentStatus` — required for
  `grfmxstatusupdate`'s webhook/dashboard logic to find and process the
  order correctly.
- `mongoId` is nullable and has a `@unique` constraint — that's fine for
  rows this app creates (no Mongo document ever existed for them). Postgres
  treats multiple `NULL`s as distinct under a unique constraint, so this
  won't collide with anything.
- `doTrackingNumber` also has a **partial unique index** in
  `grfmxstatusupdate` (see its `manual-followups.sql`) — since tracking
  numbers are sequence-generated, this should never be an issue, but it's
  there as a safety net if something generates a duplicate.
- Whatever other fields your intake form collects (receiver info, address,
  items, etc.) — map them to the matching snake_case columns per the
  `@map(...)` annotations in that Prisma schema, so `grfmxstatusupdate`'s
  own field-mapping logic (`toPostgresOrder()` in its `data/orders.js`)
  and this app agree on the same shape.

## Detrack job creation

You mentioned this app already knows how to create the Detrack job (it
currently does so reactively, watching for the Mongo document's tracking
number to flip from `N/A` to a real value). Once this app generates the
tracking number itself at insert time, that watch-and-react step is no
longer needed — just create the Detrack job synchronously, right after the
insert succeeds, using the same tracking number and order details.

## Where to find the Supabase connection details

Don't hardcode credentials into this app's repo from scratch — reuse the
existing Supabase project. The connection string
(`DATABASE_URL`/`DIRECT_URL`) is already configured in
`grfmxstatusupdate`'s Heroku Config Vars (and its local `.env`, at
`C:\Users\Syahmi Ghafar\Documents\Github Projects\grfmxstatusupdate\.env` on
this machine, if you need to reference it locally). Get it added to this
app's own Heroku Config Vars / `.env` the same way.
