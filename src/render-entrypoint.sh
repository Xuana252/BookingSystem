#!/bin/bash
set -e

# Render provides the $PORT environment variable dynamically.
# If it's not set, we default to 8080.
API_PORT="${PORT:-8080}"

# The Worker also needs a port because it hosts the Hangfire dashboard.
# We give it a different port so it doesn't collide with the API.
WORKER_PORT=8081

echo "Starting API on port $API_PORT... (This will run DB Migrations)"
export ASPNETCORE_HTTP_PORTS=$API_PORT
cd /app/api
dotnet Booking.Api.dll &

# Give the API 5 seconds to run Entity Framework Database.Migrate() 
# so the Worker doesn't try to migrate the exact same database concurrently
echo "Waiting 5 seconds for migrations..."
sleep 5

echo "Starting Worker on port $WORKER_PORT..."
export ASPNETCORE_HTTP_PORTS=$WORKER_PORT
cd /app/worker
dotnet Booking.Worker.dll &

# Wait for any background process to exit. If either crashes, the container restarts.
wait -n
exit $?
