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
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Booking.Api.dll"]
