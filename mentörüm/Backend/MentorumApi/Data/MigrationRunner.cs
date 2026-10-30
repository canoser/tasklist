using System.Data;
using Dapper;
using Npgsql;
using Serilog;

namespace MentorumApi.Data;

public static class MigrationRunner
{
    public const string ConsolidatedSyncMarker = "v18_consolidated_schema_sync";

    public static void Run(DbConnectionFactory dbFactory)
    {
        using var conn = dbFactory.CreateConnection();
        conn.Open();
        Run(conn);
    }

    public static async Task RunAsync(string connectionString)
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();
        Run(conn);
    }

    public static void Run(IDbConnection conn, string? migrationsDirOverride = null)
    {
        conn.Execute(
            "CREATE TABLE IF NOT EXISTS _schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        var migrationsDir = migrationsDirOverride ?? ResolveMigrationsDirectory();
        var files = Directory.Exists(migrationsDir)
            ? Directory.GetFiles(migrationsDir, "*.sql").OrderBy(f => f, StringComparer.OrdinalIgnoreCase).ToArray()
            : Array.Empty<string>();

        var applied = new HashSet<string>(
            conn.Query<string>("SELECT filename FROM _schema_migrations"),
            StringComparer.OrdinalIgnoreCase);

        foreach (var path in files)
        {
            var fileName = Path.GetFileName(path);
            var isConsolidatedSchema = string.Equals(fileName, "001_schema.sql", StringComparison.OrdinalIgnoreCase);
            var needsConsolidatedSync = isConsolidatedSchema && !applied.Contains(ConsolidatedSyncMarker);

            if (applied.Contains(fileName) && !needsConsolidatedSync)
            {
                Log.Information("Atlandı (uygulanmış): {File}", fileName);
                continue;
            }

            var sql = File.ReadAllText(path);
            conn.Execute(sql);
            conn.Execute(
                "INSERT INTO _schema_migrations (filename) VALUES (@File) ON CONFLICT (filename) DO NOTHING",
                new { File = fileName });

            if (isConsolidatedSchema)
            {
                conn.Execute(
                    "INSERT INTO _schema_migrations (filename) VALUES (@File) ON CONFLICT (filename) DO NOTHING",
                    new { File = ConsolidatedSyncMarker });
                applied.Add(ConsolidatedSyncMarker);
            }

            applied.Add(fileName);
            Log.Information("Migration uygulandı: {File}", fileName);
        }
    }

    private static string ResolveMigrationsDirectory()
    {
        var primary = Path.Combine(AppContext.BaseDirectory, "Data", "Migrations");
        if (Directory.Exists(primary) && Directory.GetFiles(primary, "*.sql").Length > 0)
        {
            return primary;
        }

        var fallback = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../MentorumApi/Data/Migrations"));
        return Directory.Exists(fallback) ? fallback : primary;
    }
}

