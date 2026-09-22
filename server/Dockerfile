# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY AsanInvest.sln Directory.Build.props ./
COPY AsanInvest.Api/AsanInvest.Api.csproj AsanInvest.Api/
COPY AsanInvest.Application/AsanInvest.Application.csproj AsanInvest.Application/
COPY AsanInvest.Domain/AsanInvest.Domain.csproj AsanInvest.Domain/
COPY AsanInvest.Infrastructure/AsanInvest.Infrastructure.csproj AsanInvest.Infrastructure/
RUN dotnet restore AsanInvest.Api/AsanInvest.Api.csproj
COPY . .
RUN dotnet publish AsanInvest.Api/AsanInvest.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:4000
COPY --from=build /app/publish .
RUN mkdir -p /app/uploads
EXPOSE 4000
ENTRYPOINT ["dotnet", "AsanInvest.Api.dll"]
