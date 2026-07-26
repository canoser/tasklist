using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using planlama_app.Models;

namespace planlama_app.Data
{
    public class ResourceRepository
    {
        public async Task<int> AddAsync(ResourceItem item)
        {
            const string sql = """
                INSERT INTO Resources (Title, Url, Platform) 
                VALUES (@Title, @Url, @Platform); 
                SELECT last_insert_rowid();
                """;
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteScalarAsync<int>(sql, item);
        }

        public async Task<int> RestoreAsync(ResourceItem item)
        {
            const string sql = """
                INSERT INTO Resources (Id, Title, Url, Platform) 
                VALUES (@Id, @Title, @Url, @Platform);
                """;
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, item);
        }

        public async Task<IEnumerable<ResourceItem>> GetAllAsync()
        {
            const string sql = "SELECT * FROM Resources ORDER BY Id DESC;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.QueryAsync<ResourceItem>(sql);
        }

        public async Task<int> DeleteAsync(int id)
        {
            // Aynı zamanda bu kaynağa bağlı tüm görevlerin ResourceId'sini NULL yap
            const string updateTasksSql = "UPDATE Tasks SET ResourceId = NULL WHERE ResourceId = @Id;";
            using var connection = DatabaseHelper.GetConnection();
            await connection.ExecuteAsync(updateTasksSql, new { Id = id });

            const string sql = "DELETE FROM Resources WHERE Id = @Id;";
            return await connection.ExecuteAsync(sql, new { Id = id });
        }
    }
}
