# Build context is src/ (see docker-compose.yml) so sibling ProjectReferences are available.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy just the csproj files first so `dotnet restore` is its own cached layer,
# invalidated only when a dependency changes, not on every source edit.
COPY Directory.Packages.props .
COPY Booking.Domain/Booking.Domain.csproj Booking.Domain/
COPY Booking.Application/Booking.Application.csproj Booking.Application/
COPY Booking.Infrastructure/Booking.Infrastructure.csproj Booking.Infrastructure/
COPY Booking.Worker/Booking.Worker.csproj Booking.Worker/
RUN dotnet restore Booking.Worker/Booking.Worker.csproj

COPY Booking.Domain/ Booking.Domain/
COPY Booking.Application/ Booking.Application/
COPY Booking.Infrastructure/ Booking.Infrastructure/
COPY Booking.Worker/ Booking.Worker/
RUN dotnet publish Booking.Worker/Booking.Worker.csproj -c Release -o /app --no-restore

# aspnet base image, not plain runtime — Booking.Worker now also hosts the Hangfire dashboard.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Booking.Worker.dll"]
