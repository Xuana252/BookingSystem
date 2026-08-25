# Splunk

**Status:** Applied in project
**OJT tracker category:** DevOps / Observability

## Summary

Splunk is a centralized log search/indexing platform. In this project it's reached not by the
app talking to Splunk directly, but through a Fluent Bit log-shipping sidecar — see
`doc/notes/sidecar-pattern.md` for the pattern itself.

## Key Concepts

- **HEC (HTTP Event Collector)** — Splunk's HTTP ingestion endpoint; a token-authenticated POST
  target for events. The standard way to push logs in from outside Splunk without a native
  forwarder installed on the source host.
- **Two HEC endpoint shapes** — the *event* endpoint (`/services/collector/event`, wraps each
  record as `{"event": {...fields...}}`) is for already-structured records; the *raw* endpoint is
  for unstructured text streams. Sending structured, already-field-parsed data to the raw
  endpoint produces a misleading-looking `{"text":"No data","code":5}` error rather than a clear
  "wrong endpoint" message.
- **Sidecar log shipping** — application containers write structured JSON to stdout and know
  nothing about Splunk at all; a separate container receives, parses, and forwards that output.
  Keeps app code fully decoupled from the observability backend — swapping Splunk for something
  else later wouldn't touch app code.
- **Docker's `fluentd` logging driver** — a built-in Docker daemon feature that forwards a
  container's stdout/stderr to a fluentd/Fluent-Bit-compatible listener, configured per-service
  in `docker-compose.yml` rather than in application code.
- **Structured logging at the source matters** — a JSON-formatted log line is what lets a
  downstream parser turn one opaque string into real, individually searchable fields in Splunk,
  instead of one big text blob.

## Reference / Cheatsheet

`docker-compose.yml` service logging config:
```yaml
logging:
  driver: fluentd
  options:
    fluentd-address: "localhost:24224"
    tag: "booking.api"
```

Fluent Bit output stanza (`fluent-bit.conf`):
```
[OUTPUT]
    Name          splunk
    Match         *
    Host          splunk
    Port          8088
    Splunk_Token  ${SPLUNK_HEC_TOKEN}
    TLS           Off
```

Splunk web UI: `http://localhost:8000` (`admin` / configured password). Search example:
`index=* CorrelationId=<id>`.

## Applied In This Project

- `src/docker-compose.yml` — `splunk` service (self-hosted `splunk/splunk` image;
  `SPLUNK_HEC_TOKEN` auto-provisions a matching HEC input at first boot, no external account or
  manual token setup needed); `fluent-bit` service — one shared instance handling both `api` and
  `worker` rather than a strict one-per-container sidecar (an honest simplification, documented
  in `doc/notes/sidecar-pattern.md`, closer to a node-level agent than the textbook pattern).
  `api` and `worker` are both configured with `logging: driver: fluentd`, pointed at fluent-bit's
  published port (the `fluentd` driver runs inside the Docker daemon, not the container's own
  network namespace, so it can't resolve the `fluent-bit` service name directly — it reaches it
  via the host-published port instead).
- `src/fluent-bit/fluent-bit.conf` — a `forward` input listening on `24224` (what Docker's
  `fluentd` driver talks to), a `parser` filter that extracts Serilog's JSON out of Docker's
  log-wrapper (`log`) key, and a `splunk` output using the HEC *event* endpoint (`Splunk_Send_Raw`
  left at its default `Off` — see Key Concepts on why the raw endpoint is wrong here).
- `Booking.Api/Program.cs` and `Booking.Worker/Program.cs` — Serilog configured with
  `new Serilog.Formatting.Json.JsonFormatter(renderMessage: true)` writing to `Console`; neither
  file has any Splunk-specific code, matching the sidecar principle that app code shouldn't know
  the log destination exists.
- Two real bugs found and fixed live during setup, neither caught by any build/test: newer Splunk
  images also require `SPLUNK_GENERAL_TERMS` alongside `SPLUNK_START_ARGS=--accept-license` or the
  container refuses to start; and `Splunk_Send_Raw On` initially routed events to the wrong HEC
  endpoint shape, producing Splunk's `{"text":"No data","code":5}` error — fixed by switching to
  the default event endpoint.
- Verified live, end to end: a real reservation-creation request was searched for and found in
  Splunk's own search UI, independently re-confirmed via `docker logs local-fluent-bit` after
  each of the two fixes above.

## Open Questions / Next Steps

- An actual unhandled exception hasn't specifically been triggered-and-found in Splunk's search
  UI yet — only normal request/event logs have been verified there so far. `GlobalExceptionMiddleware`'s
  response shape is unit-tested separately, but the exception log line reaching Splunk end-to-end
  is still an open verification gap.
