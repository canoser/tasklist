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

        public async Task<IEnumerable<ResourceItem>> GetAllAsync()
        {
            const string sql = "SELECT * FROM Resources ORDER BY Id DESC;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.QueryAsync<ResourceItem>(sql);
        }

        public async Task<int> DeleteAsync(int id)
        {
            const string sql = "DELETE FROM Resources WHERE Id = @Id;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, new { Id = id });
        }
    }
}
