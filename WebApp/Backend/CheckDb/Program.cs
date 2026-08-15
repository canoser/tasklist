using System;
using Npgsql;

class Program
{
    static void Main()
    {
        var connStr = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrEmpty(connStr)) return;

        using var conn = new NpgsqlConnection(connStr);
        conn.Open();

        using (var cmd = new NpgsqlCommand("SELECT * FROM \"workspacemembers\"", conn))
        using (var reader = cmd.ExecuteReader())
        {
            while (reader.Read())
            {
                Console.WriteLine($"Id: {reader["id"]}, WorkspaceId: {reader["workspaceid"]}, UserId: {reader["userid"]}, TenantId: {reader["tenantid"]}, Role: {reader["role"]}, IsActiveMember: {reader["isactivemember"]}");
            }
        }
        
        Console.WriteLine("----------------");
        using (var cmd2 = new NpgsqlCommand("SELECT * FROM \"workspaces\"", conn))
        using (var reader2 = cmd2.ExecuteReader())
        {
            while (reader2.Read())
            {
                Console.WriteLine($"W_Id: {reader2["id"]}, TenantId: {reader2["tenantid"]}, OwnerId: {reader2["ownerid"]}, IsActive: {reader2["isactive"]}");
            }
        }

        Console.WriteLine("----------------");
        using (var cmd3 = new NpgsqlCommand("SELECT \"errormessage\", \"createdat\" FROM \"systemerrors\" ORDER BY \"createdat\" DESC LIMIT 10", conn))
        using (var reader3 = cmd3.ExecuteReader())
        {
            while (reader3.Read())
            {
                Console.WriteLine($"TIME: {reader3["createdat"]}, ERR: {reader3["errormessage"]}");
            }
        }
    }
}
