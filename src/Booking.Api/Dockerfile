# Build context is src/ (see docker-compose.yml) so sibling ProjectReferences are available.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy just the csproj files first so `dotnet restore` is its own cached layer,
# invalidated only when a dependency changes, not on every source edit.
COPY Directory.Packages.props .
COPY Booking.Domain/Booking.Domain.csproj Booking.Domain/
COPY Booking.Application/Booking.Application.csproj Booking.Application/
COPY Booking.Infrastructure/Booking.Infrastructure.csproj Booking.Infrastructure/
COPY Booking.Api/Booking.Api.csproj Booking.Api/
RUN dotnet restore Booking.Api/Booking.Api.csproj

COPY Booking.Domain/ Booking.Domain/
COPY Booking.Application/ Booking.Application/
COPY Booking.Infrastructure/ Booking.Infrastructure/
COPY Booking.Api/ Booking.Api/
RUN dotnet publish Booking.Api/Booking.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install New Relic .NET Agent for APM
RUN mkdir -p /etc/apt/keyrings \
    && apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && echo 'deb [signed-by=/etc/apt/keyrings/newrelic-apt.gpg] http://apt.newrelic.com/debian/ newrelic non-free' | tee /etc/apt/sources.list.d/newrelic.list \
    && curl -fsSL https://download.newrelic.com/NEWRELIC_APT_2DAD550E.public | gpg --dearmor -o /etc/apt/keyrings/newrelic-apt.gpg \
    && apt-get update \
    && apt-get install -y --no-install-recommends newrelic-dotnet-agent \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Booking.Api.dll"]
