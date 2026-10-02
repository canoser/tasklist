using Npgsql;
using System.Data;

namespace MentorumApi.Data
{
    public class DbConnectionFactory
    {
        private readonly IConfiguration _configuration;

        public DbConnectionFactory(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public virtual IDbConnection CreateConnection()
        {
            var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
                ?? _configuration.GetConnectionString("DefaultConnection");

            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Veritabanı bağlantı dizesi (DATABASE_URL) bulunamadı.");
            }

            return new NpgsqlConnection(connectionString);
        }
    }
}
