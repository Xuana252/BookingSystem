# Sidecar Pattern

**Status:** Applied in project
**OJT tracker category:** Architecture

## Summary

A software architecture pattern where a helper component runs alongside a main application — in
the same execution environment (pod, VM, or host) — as a separate, independent process. Like a
motorcycle sidecar, it travels with the main app but isn't the engine driving it.

## Key Concepts

- **Shared lifecycle** — starts and stops with the main application.
- **Shared resources** — same network namespace, storage, or local resources (e.g., same
  Kubernetes pod, shared `localhost`).
- **Loose coupling** — technically independent; can be written in a different language, updated
  separately.
- **Single responsibility** — usually does one thing (proxying, logging, metrics, secrets).

## Reference / Cheatsheet

### Common use cases

- **Service mesh proxies** — e.g., Envoy in Istio, intercepting network traffic for routing,
  retries, TLS, and observability.
- **Logging/monitoring agents** — collecting and shipping logs or metrics.
- **Configuration/secrets management** — e.g., Vault Agent injecting secrets into the app's
  filesystem.
- **Authentication/authorization** — an "ambassador" style sidecar handling auth before requests
  reach the app.

### Why use it

- Separation of concerns — cross-cutting infrastructure logic stays out of business logic.
- Language/runtime agnostic — sidecar can be written independently of the main app's tech stack.
- Reusability — the same sidecar can attach to many different services.
- Independent deployment/scaling — sidecar can be updated without redeploying the main app.

### Trade-offs

- Added complexity — more moving parts to deploy, monitor, and debug.
- Resource overhead — each sidecar consumes its own CPU/memory.
- Latency — if the sidecar sits in the request path (e.g., a proxy), it adds a hop.

### Sidecar vs. node-level agent

A common alternative is a **node-level agent** (e.g., a Kubernetes DaemonSet) — one shared helper
process per host serving all applications on that host, rather than one helper per application
instance.

| | Sidecar (per instance) | Node-level agent (shared) |
|---|---|---|
| Isolation | Per-app config, easy customization | Shared config across all apps on a node |
| Resource cost | Higher (N instances = N agents) | Lower (1 agent per node) |
| Best for | Apps needing custom behavior | Uniform behavior across most apps |

Most closely associated with Kubernetes and microservices/service mesh architectures, since these
environments benefit from attaching consistent auxiliary behavior (networking, observability,
security) to many independent services without duplicating logic in each one. The underlying
concept predates Kubernetes and applies anywhere you want to attach auxiliary behavior to a
primary process.

## Applied In This Project

Log shipping for Phase 2's Splunk logging item, via **Fluent Bit** — `src/docker-compose.yml`:
- `Booking.Api`/`Booking.Worker` write structured JSON to stdout (`Serilog.Formatting.Json.JsonFormatter`
  in each `Program.cs`) and have zero knowledge that Splunk exists — no HEC sink, no Splunk
  package reference anywhere in application code.
- Docker's `fluentd` logging driver (configured per-service under `logging:` in
  `docker-compose.yml`) forwards each container's stdout to the `fluent-bit` container.
- `src/fluent-bit/fluent-bit.conf` parses that JSON out of Docker's wrapper record and ships it
  to Splunk's HTTP Event Collector (`src/fluent-bit/parsers.conf` defines the parser, keyed off
  Serilog's `Timestamp` field).
- The `splunk` service itself is self-hosted (`splunk/splunk` image), auto-provisioning a
  matching HEC token at first boot via `SPLUNK_HEC_TOKEN` — no external account, consistent with
  Splunk staying a real integration rather than research-only.

**Honest deviation from the textbook pattern**: this is **one shared Fluent Bit container serving
both `api` and `worker`**, not one sidecar per app instance. That's architecturally closer to the
**node-level agent** alternative described above than a strict sidecar — running two separate
Fluent Bit containers in Docker Compose would add real overhead (two containers, two configs)
for no isolation benefit at this project's scale, since both services log the same shape of data
to the same destination. A true per-instance sidecar would also need something like
`network_mode: "service:api"` to share a network namespace, which Docker Compose supports but
isn't the natural fit here since the connection is over `fluentd`'s network protocol rather than
`localhost`. Named plainly rather than presented as the canonical pattern.

## Open Questions / Next Steps

- If BookingSystem ever moves to Kubernetes, revisit as a true per-pod sidecar (one Fluent Bit
  container per Api/Worker pod, sharing that pod's network namespace) instead of the shared
  container this Compose setup uses.
- Fluent Bit's `fluentd-address` for the Docker logging driver had to be `localhost:24224` (via
  fluent-bit's published host port), not the `fluent-bit` service DNS name — the driver runs
  inside the Docker daemon itself, outside the compose network's container-to-container DNS.
  Worth remembering as a general gotcha for this driver, not specific to this project.
- Not yet verified against a live Splunk instance in this session (Docker unavailable) — the
  compose config validates (`docker compose config`) and the app builds/tests clean, but the
  actual log round-trip (Api/Worker → Fluent Bit → Splunk HEC → visible in Splunk's search UI)
  still needs a real run to confirm.
