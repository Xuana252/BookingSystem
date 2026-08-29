# DynamoDB

**Status:** Research only (not yet built)
**OJT tracker category:** Database

## Summary

A fully-managed, serverless NoSQL key-value/document database from AWS. Unlike Postgres, there's
no server to provision or patch, no fixed schema, and scaling (both storage and throughput) is
handled automatically by AWS rather than by sizing a machine.

## Key Concepts

- **Primary key is mandatory and defines access patterns** — either a simple **partition key**
  (hash key) alone, or a **composite key** (partition key + **sort key**). Every item must have
  one; there's no auto-incrementing surrogate ID like a Postgres serial column.
- **Schema-less items, not schema-less tables** — the table itself only declares its key schema;
  every other attribute is free-form per item. Two items in the same table can have completely
  different shapes.
- **No joins, no foreign keys** — related data either gets denormalized into a single item, or
  fetched via multiple round trips / a **Global Secondary Index (GSI)**. This is the single
  biggest mental shift from a relational database.
- **Single-table design** — the recommended DynamoDB pattern is to model *multiple* entity types
  in *one* table (distinguished by prefixed key values, e.g. `USER#123` / `ROOM#456`), designed
  around the application's known access patterns up front — the inverse of relational modeling,
  where you normalize first and figure out queries later.
- **Capacity modes** — *On-demand* (pay per request, scales automatically, good for unpredictable
  traffic) vs. *Provisioned* (pre-purchased read/write capacity units, cheaper at steady predictable
  load but throttles if exceeded).
- **Consistency**: reads are *eventually consistent* by default (cheaper, faster); *strongly
  consistent* reads are opt-in per request (never read from a secondary index, cost more).

## Reference / Cheatsheet

Core operations (via any AWS SDK, or the CLI):
- `PutItem` / `GetItem` / `UpdateItem` / `DeleteItem` — single-item CRUD by primary key.
- `Query` — fetch items sharing a partition key (optionally filtered by sort-key condition) —
  the efficient, intended way to fetch a range of related items.
- `Scan` — reads the *entire* table, filtering client-side-ish after the fact — expensive, avoid
  in production access patterns; fine for one-off admin/debug lookups.
- **GSI (Global Secondary Index)** — an alternate partition/sort key over the same table, enabling
  a second query pattern without a second table.
- **TTL (Time To Live)** — an attribute that, once past, gets the item auto-deleted by AWS for
  free — commonly used for session data, caches, or expiring holds.

### DynamoDB vs. Postgres, for this project's domain

| | DynamoDB | Postgres (what this project uses) |
|---|---|---|
| Schema | Per-item, flexible | Fixed, per-table (EF Core migrations) |
| Relationships | Denormalize or multi-query | Native FKs + joins (`Reservation.RoomId`/`UserId`) |
| Query flexibility | Limited to key/index-shaped queries | Arbitrary `WHERE`/`JOIN`/aggregate queries |
| Scaling | Automatic, managed by AWS | Manual (bigger instance, read replicas, etc.) |
| Best fit here | A high-write, low-relationship log (e.g. an audit/event-history table) | The actual domain — Rooms, Users, Reservations, Notifications are inherently relational |

## Applied In This Project

Not applied — `MOTO_SERVICE` in `src/docker-compose.yml` already enables Moto's DynamoDB
emulation (see `doc/notes/moto.md`), but nothing in `Booking.Infrastructure` talks to it. The
domain here (`Room` ↔ `Reservation` ↔ `User` ↔ `Notification`, all FK-linked, queried with
overlap/range conditions in `BookingRuleEngine` and `ReservationReminderService`) is a genuinely
relational shape that Postgres/EF Core already fits well — swapping it for DynamoDB would mean
either denormalizing reservations onto rooms/users (losing the clean FK model) or running
multiple queries plus a GSI to approximate what one SQL `WHERE RoomId = @x AND StartTime <= @y`
already does in one round trip. Per the OJT plan this stays a research topic with no build
dependency for BookingSystem.

## Open Questions / Next Steps

- The one place DynamoDB's shape would genuinely fit this project: an append-only audit/event log
  (e.g. a raw copy of every `EventEnvelope` that ever passed through SNS/SQS) — high write volume,
  no relational queries needed, natural partition key (`EventType` or `Source`), and TTL could
  auto-expire old entries. Not planned, but the clearest "would actually use DynamoDB for this"
  case if the project ever wanted one.
