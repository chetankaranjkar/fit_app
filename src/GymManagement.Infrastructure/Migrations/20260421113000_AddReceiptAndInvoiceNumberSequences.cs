using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260421113000_AddReceiptAndInvoiceNumberSequences")]
    public partial class AddReceiptAndInvoiceNumberSequences : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'ReceiptNumberSeq' AND schema_id = SCHEMA_ID('dbo'))
                BEGIN
                    CREATE SEQUENCE [dbo].[ReceiptNumberSeq]
                        AS BIGINT
                        START WITH 1
                        INCREMENT BY 1;
                END
                """);

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'InvoiceNumberSeq' AND schema_id = SCHEMA_ID('dbo'))
                BEGIN
                    CREATE SEQUENCE [dbo].[InvoiceNumberSeq]
                        AS BIGINT
                        START WITH 1
                        INCREMENT BY 1;
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'InvoiceNumberSeq' AND schema_id = SCHEMA_ID('dbo'))
                BEGIN
                    DROP SEQUENCE [dbo].[InvoiceNumberSeq];
                END
                """);

            migrationBuilder.Sql(
                """
                IF EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'ReceiptNumberSeq' AND schema_id = SCHEMA_ID('dbo'))
                BEGIN
                    DROP SEQUENCE [dbo].[ReceiptNumberSeq];
                END
                """);
        }
    }
}

