#!/bin/bash
set -e

# Render provides the $PORT environment variable dynamically.
# If it's not set, we default to 8080.
API_PORT="${PORT:-8080}"

# The Worker also needs a port because it hosts the Hangfire dashboard.
# We give it a different port so it doesn't collide with the API.
WORKER_PORT=8081

echo "Starting Worker on port $WORKER_PORT..."
export ASPNETCORE_HTTP_PORTS=$WORKER_PORT
cd /app/worker
dotnet Booking.Worker.dll &

echo "Starting API on port $API_PORT..."
export ASPNETCORE_HTTP_PORTS=$API_PORT
cd /app/api
dotnet Booking.Api.dll &

# Wait for any background process to exit. If either crashes, the container restarts.
wait -n
exit $?
