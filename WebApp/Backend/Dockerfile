# ─── Build Stage ────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Proje dosyalarını kopyala ve restore et (cache layer için önce)
COPY ["PlanlamaApp.Api/PlanlamaApp.Api.csproj", "PlanlamaApp.Api/"]
COPY ["PlanlamaApp.Application/PlanlamaApp.Application.csproj", "PlanlamaApp.Application/"]
COPY ["PlanlamaApp.Domain/PlanlamaApp.Domain.csproj", "PlanlamaApp.Domain/"]
COPY ["PlanlamaApp.Infrastructure/PlanlamaApp.Infrastructure.csproj", "PlanlamaApp.Infrastructure/"]
RUN dotnet restore "PlanlamaApp.Api/PlanlamaApp.Api.csproj"

# Tüm kaynak dosyaları kopyala ve publish et
COPY . .
RUN dotnet publish "PlanlamaApp.Api/PlanlamaApp.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# ─── Runtime Stage ──────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Güvenlik: root olmayan kullanıcı ile çalıştır
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

COPY --from=build /app/publish .

# Fly.io PORT env değişkenini kullanır
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "PlanlamaApp.Api.dll"]
