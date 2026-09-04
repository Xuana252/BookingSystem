using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Booking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // defaultValue: true, not the scaffolded false — this backfills every *existing* row
            // (including any real self-registered user already sitting in the database, not just
            // the seeded admin) to active. EF's scaffolder defaulted to false here since nothing
            // in UserConfiguration tells it the entity's `= true` CLR default should also be the
            // column's SQL default; false would have retroactively locked out every account that
            // isn't the one row a separate UpdateData explicitly flips back — caught by hand, not
            // caught by any tool.
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Users");
        }
    }
}
