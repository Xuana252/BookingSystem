# Docker Basics — Summary

**Status:** Applied in project
**OJT tracker category:** DevOps

## Summary

Docker packages an app and its dependencies into a portable, isolated **image**, run as a
**container**. `docker-compose` orchestrates multiple containers (app + its infra) as one unit.

## Key Concepts

| Term | Meaning |
|---|---|
| **Image** | Read-only template (filesystem + metadata) used to create containers. Built from a `Dockerfile`. |
| **Container** | A running (or stopped) instance of an image. Isolated process, shares host kernel. |
| **Dockerfile** | Script of instructions to build an image. |
| **Registry** | Where images are stored/shared (Docker Hub, ECR, GCR, GHCR, private). |
| **Volume** | Persistent storage outside the container's writable layer. |
| **Network** | How containers talk to each other and the outside world. |

## Reference / Cheatsheet

### Dockerfile basics

```dockerfile
FROM node:20-slim          # base image
WORKDIR /app                # working directory inside container
COPY package*.json ./       # copy files in
RUN npm install              # runs at BUILD time (creates a layer)
COPY . .
EXPOSE 3000                  # documents the port (doesn't publish it)
ENV NODE_ENV=production
CMD ["node", "server.js"]    # default command when container STARTS
```

- `RUN` → executes at build time. `CMD`/`ENTRYPOINT` → executes at container start
  (`ENTRYPOINT` = fixed executable, `CMD` = default args).
- Order matters for caching: put things that change least (dependencies) before things that
  change most (source code).
- `.dockerignore` works like `.gitignore` — keeps the build context small.

### Common commands

**Images**
```bash
docker build -t myapp:1.0 .   # build image
docker images                  # list images
docker rmi myapp:1.0           # remove image
docker pull nginx              # download image
docker push myrepo/myapp:1.0   # upload image
```

**Containers**
```bash
docker run -d -p 8080:80 --name web nginx   # run detached, map port
docker ps                                    # running containers
docker ps -a                                 # all containers (incl. stopped)
docker stop web                              # stop
docker start web                             # start again
docker rm web                                # remove
docker logs -f web                           # follow logs
docker exec -it web bash                     # shell into running container
docker inspect web                           # detailed metadata
```

**Cleanup**
```bash
docker system prune       # remove unused containers/images/networks
docker system prune -a    # also remove unused images
docker volume prune       # remove unused volumes
```

**Volumes & networking**
```bash
docker volume create mydata
docker run -v mydata:/data myapp        # named volume
docker run -v $(pwd):/app myapp         # bind mount

docker network create mynet
docker run --network mynet myapp
```

### docker-compose (multi-container apps)

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - db
    environment:
      - DB_HOST=db
  db:
    image: postgres:16
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

```bash
docker compose up -d
docker compose down
docker compose logs -f
docker compose ps
```

### Best practices / common gotchas

- **Layer caching**: reorder Dockerfile so rarely-changing steps (installing deps) come before
  frequently-changing steps (copying source code). A cache miss on one layer invalidates every
  layer after it. Pin base image tags (avoid `latest`) for predictable cache behavior. Combine
  related `RUN` steps (e.g. `apt-get update && apt-get install`) so cached package lists don't go
  stale.
- **Don't run as root** in production images — add a non-root `USER`.
- **`-p host:container`**: port mapping direction is easy to mix up.
- **`-d` vs `-it`**: `-d` runs detached (background); `-it` gives an interactive TTY.
- **Data doesn't persist** unless you use volumes — the container filesystem is ephemeral once the
  container is removed.
- **One process per container** is the general philosophy — use compose/orchestration for
  multi-service apps rather than supervisors inside one container.

## Applied In This Project

- `src/docker-compose.yml` — the whole local infra stack: `postgres:16` (with a named volume,
  `postgres_data`), `redis:7.2-alpine`, `motoserver/moto` (with a health check), and a one-shot
  `moto-init` container that provisions AWS resources on startup.
- `src/moto-init/init-all.sh` — mounted into the `moto-init` container as a bind mount
  (`./moto-init:/moto-init:ro`), run via a fixed `entrypoint`.
- Health checks used to sequence startup: `moto-init` has `depends_on: moto: condition:
  service_healthy`, so it only runs once Moto is actually ready, not just started.

## Open Questions / Next Steps

- No `Dockerfile` for `Booking.Api`/`Booking.Worker` yet — those land in a later phase when the
  Api/Worker services themselves get containerized (the reference project's own
  `docker-compose.yml` builds them from per-project `Dockerfile`s).
