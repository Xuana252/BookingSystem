# Sidecar Pattern

**Status:** Research only (not yet built)
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

Not applied — per the OJT plan, Sidecar pattern is a Sprint 2 research topic with no build
dependency for BookingSystem. This solution runs as plain processes (`Booking.Api`,
`Booking.Worker`) with no orchestration platform (Kubernetes/service mesh) that would make a
sidecar meaningful — there's no natural place to attach one yet.

## Open Questions / Next Steps

- If BookingSystem ever moves to a container-orchestration platform, revisit for log
  shipping/observability (see `docker.md` for the current, sidecar-free container setup).
