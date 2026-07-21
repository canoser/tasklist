using System;
using System.Data;
using System.IO;
using Dapper;
using Microsoft.Data.Sqlite;

namespace planlama_app.Data
{
    /// <summary>
    /// SQLite veritabanı bağlantısını yöneten ve şemayı başlatan yardımcı sınıf.
    /// </summary>
    public static class DatabaseHelper
    {
        // EXE ile aynı dizinde "Data" klasörü oluşturup veritabanını oraya koyalım
        private static readonly string DbFolder = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory,
            "Data");

        private static readonly string DbPath = Path.Combine(DbFolder, "tasks.db");

        /// <summary>
        /// Dapper ve SQLite için kullanılabilir, açık bir IDbConnection döndürür.
        /// </summary>
        public static IDbConnection GetConnection()
        {
            var connection = new SqliteConnection($"Data Source={DbPath}");
            connection.Open();
            return connection;
        }

        /// <summary>
        /// Uygulama ilk açıldığında çağrılır.
        /// Klasörü, veritabanı dosyasını ve tabloları oluşturur.
        /// </summary>
        public static void Initialize()
        {
            // Klasör yoksa oluştur
            if (!Directory.Exists(DbFolder))
                Directory.CreateDirectory(DbFolder);

            using var connection = GetConnection();
            CreateTables(connection);
        }

        // ---------------------------------------------------------------
        // DDL Sorguları
        // ---------------------------------------------------------------
        private static void CreateTables(IDbConnection connection)
        {
            const string sql = """
                CREATE TABLE IF NOT EXISTS Categories (
                    Id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    Name          TEXT    NOT NULL
                );

                CREATE TABLE IF NOT EXISTS Resources (
                    Id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    Title         TEXT    NOT NULL,
                    Url           TEXT    NOT NULL,
                    Platform      INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS Tasks (
                    Id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    CategoryId    INTEGER NULL,
                    Title         TEXT    NOT NULL,
                    DueDate       TEXT    NULL,        -- ISO 8601 string: "yyyy-MM-dd HH:mm:ss"
                    IsCompleted   INTEGER NOT NULL DEFAULT 0,  -- SQLite'da bool olmadığından 0/1
                    TaskType      INTEGER NOT NULL DEFAULT 0,  -- Enum
                    ChainId       TEXT    NULL,
                    OrderIndex    INTEGER NOT NULL DEFAULT 0,
                    EstimatedTime INTEGER NULL         -- Yaklaşık süre (dakika)
                );

                CREATE INDEX IF NOT EXISTS IX_Tasks_ChainId
                    ON Tasks (ChainId);

                CREATE INDEX IF NOT EXISTS IX_Tasks_IsCompleted
                    ON Tasks (IsCompleted);
                """;

            connection.Execute(sql);

            // Geriye dönük uyumluluk: Mevcut veritabanında sütun yoksa ekle (Migration)
            try
            {
                connection.Execute("ALTER TABLE Tasks ADD COLUMN EstimatedTime INTEGER NULL;");
            }
            catch { /* Sütun zaten varsa hata fırlatır, yoksayıyoruz. */ }

            try
            {
                connection.Execute("ALTER TABLE Tasks ADD COLUMN CategoryId INTEGER NULL;");
            }
            catch { /* Sütun zaten varsa hata fırlatır, yoksayıyoruz. */ }
        }
    }
}
