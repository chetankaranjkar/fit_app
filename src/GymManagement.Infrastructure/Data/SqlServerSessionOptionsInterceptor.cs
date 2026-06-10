using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace GymManagement.Infrastructure.Data;

/// <summary>
/// Filtered indexes on SQL Server require QUOTED_IDENTIFIER ON for INSERT/UPDATE.
/// </summary>
public sealed class SqlServerSessionOptionsInterceptor : DbConnectionInterceptor
{
    private const string SessionSql = "SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;";

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        Apply(connection);
    }

    public override Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        Apply(connection);
        return Task.CompletedTask;
    }

    private static void Apply(DbConnection connection)
    {
        if (connection is not Microsoft.Data.SqlClient.SqlConnection)
            return;

        using var cmd = connection.CreateCommand();
        cmd.CommandText = SessionSql;
        cmd.ExecuteNonQuery();
    }
}
