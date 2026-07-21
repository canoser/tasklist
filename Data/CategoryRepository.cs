using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using planlama_app.Models;

namespace planlama_app.Data
{
    public class CategoryRepository
    {
        public async Task<int> AddAsync(Category category)
        {
            const string sql = "INSERT INTO Categories (Name) VALUES (@Name); SELECT last_insert_rowid();";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteScalarAsync<int>(sql, category);
        }

        public async Task<IEnumerable<Category>> GetAllAsync()
        {
            const string sql = "SELECT * FROM Categories ORDER BY Id;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.QueryAsync<Category>(sql);
        }

        public async Task<int> UpdateAsync(Category category)
        {
            const string sql = "UPDATE Categories SET Name = @Name WHERE Id = @Id;";
            using var connection = DatabaseHelper.GetConnection();
            return await connection.ExecuteAsync(sql, category);
        }

        public async Task<int> DeleteAsync(int id)
        {
            const string sql = "DELETE FROM Categories WHERE Id = @Id;";
            using var connection = DatabaseHelper.GetConnection();
            
            // Aynı zamanda bu kategoriye sahip görevlerin CategoryId'sini NULL yapalım (Cascade benzeri)
            const string updateTasksSql = "UPDATE Tasks SET CategoryId = NULL WHERE CategoryId = @Id;";
            await connection.ExecuteAsync(updateTasksSql, new { Id = id });

            return await connection.ExecuteAsync(sql, new { Id = id });
        }
    }
}
