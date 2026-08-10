# PostgreSQL Fundamentals — Summary

**Status:** Applied in project
**OJT tracker category:** Database

## Summary

PostgreSQL is an open-source, object-relational database (RDBMS) known for strict SQL standards
compliance, strong data integrity, and extensibility (custom types, extensions like PostGIS,
pgvector, etc.).

## Key Concepts

- **Structure**: Server (cluster) → hosts multiple **databases** → contains **schemas**
  (namespaces; default is `public`) → contains **tables**, **views**, **functions**, etc.
- **Constraints**: `PRIMARY KEY` (unique row identifier), `FOREIGN KEY` (referential integrity
  between tables), `UNIQUE` (no duplicate values), `NOT NULL` (value required), `CHECK` (custom
  validation rule), `DEFAULT` (fallback value).
- **Transactions & ACID**: `BEGIN`/`COMMIT`/`ROLLBACK`/`SAVEPOINT`. Atomicity, Consistency,
  Isolation, Durability.
- **Normalization**: primary keys identify rows, foreign keys link tables and enforce integrity;
  normalization (1NF/2NF/3NF) reduces redundancy and improves consistency.

## Reference / Cheatsheet

### Data types

- **Numeric**: `integer`, `bigint`, `numeric`, `real`
- **Text**: `text`, `varchar(n)`, `char(n)`
- **Date/time**: `timestamp`, `timestamptz`, `date`, `interval`
- **Boolean**: `boolean`
- **Special**: `uuid`, `json`/`jsonb`, `array`, `enum`

### CRUD basics

- **Create**: `INSERT INTO table (...) VALUES (...)`
- **Read**: `SELECT ... FROM table WHERE ...`
- **Update**: `UPDATE table SET ... WHERE ...`
- **Delete**: `DELETE FROM table WHERE ...`

### Joins

- `INNER JOIN` — only matching rows from both tables
- `LEFT JOIN` — all rows from the left table, matched rows from the right (NULL if none)
- `RIGHT JOIN`/`FULL JOIN` — less common, but useful for the reverse or full match
- `CROSS JOIN` — cartesian product of both tables

### Indexes

- **B-tree** (default) — good for equality and range queries
- **GIN** — good for `jsonb`, arrays, full-text search
- **GiST**, **BRIN** — specialized use cases (geometric data, very large sequential tables)
- Trade-off: indexes speed up reads but slow down writes

### Isolation levels (increasing strictness)

| Level | Prevents |
|---|---|
| `READ COMMITTED` (default) | Dirty reads |
| `REPEATABLE READ` | Dirty + non-repeatable reads |
| `SERIALIZABLE` | All anomalies (may require retry logic) |

### Aggregation & grouping

- `GROUP BY` — groups rows sharing a value
- `HAVING` — filters groups after aggregation
- Common aggregate functions: `COUNT()`, `SUM()`, `AVG()`, `MIN()`, `MAX()`

### Views, functions, triggers

- **View** — a saved query that behaves like a virtual table
- **Function** — reusable logic, written in SQL or PL/pgSQL
- **Trigger** — logic that runs automatically on `INSERT`, `UPDATE`, or `DELETE`

### Performance basics

- `EXPLAIN` / `EXPLAIN ANALYZE` — shows the query execution plan; used to check whether indexes
  are being used and where time is spent. Foundational habit for diagnosing slow queries.

## Applied In This Project

Via EF Core, not raw SQL, but the underlying concepts map directly:
- `src/docker-compose.yml` — `postgres:16` service, database `devdb`, credentials `dev`/`dev`.
- `Booking.Infrastructure/Persistence/BookingDbContext.cs` — the schema surface (`Users`,
  `Rooms`, `Reservations` tables — `public` schema, PostgreSQL's default).
- `Booking.Infrastructure/Persistence/Configurations/*.cs` — constraints in EF Core terms:
  `HasKey` (PRIMARY KEY), `HasForeignKey`/`OnDelete(Cascade)` (FOREIGN KEY) in
  `ReservationConfiguration.cs`, `HasIndex(...).IsUnique()` (UNIQUE constraint) on `User.Email`
  and `User.Username` in `UserConfiguration.cs`.
- `Booking.Infrastructure/Persistence/Migrations/20260809045459_InitialCreate.cs` — the generated
  DDL (`CREATE TABLE`, constraints, indexes) — this *is* the CRUD/constraints/indexes chapters,
  generated rather than hand-written.
- Verified via `docker exec local-postgres psql -U dev -d devdb -c "\dt"` that the tables and
  `__EFMigrationsHistory` (EF Core's own migration-tracking table) exist as expected.

## Open Questions / Next Steps

- No views, functions, triggers, or GIN indexes used yet — nothing in the current schema needs
  them. Revisit if the room-availability lookup (Phase 2) turns out to need a specialized index.
- Transaction/isolation-level tuning hasn't come up — each request so far is a single
  add-and-save, no multi-step transactions yet. Likely relevant once Phase 2's booking-hold
  expiry logic needs read-then-write consistency.
