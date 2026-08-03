FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Sadece projeleri kopyalayıp bağımlılıkları yüklüyoruz (Cache için)
COPY ["PlanlamaApp.sln", "./"]
COPY ["PlanlamaApp.Api/PlanlamaApp.Api.csproj", "PlanlamaApp.Api/"]
COPY ["PlanlamaApp.Application/PlanlamaApp.Application.csproj", "PlanlamaApp.Application/"]
COPY ["PlanlamaApp.Domain/PlanlamaApp.Domain.csproj", "PlanlamaApp.Domain/"]
COPY ["PlanlamaApp.Infrastructure/PlanlamaApp.Infrastructure.csproj", "PlanlamaApp.Infrastructure/"]
COPY ["Tests/PlanlamaApp.IntegrationTests/PlanlamaApp.IntegrationTests.csproj", "Tests/PlanlamaApp.IntegrationTests/"]

RUN dotnet restore "PlanlamaApp.sln"

# Tüm kodları kopyala ve yayınla
COPY . .
WORKDIR "/src/PlanlamaApp.Api"
RUN dotnet publish "PlanlamaApp.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Çalıştırma İmajı
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render genelde 80 veya 8080 portunu dinler
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "PlanlamaApp.Api.dll"]
