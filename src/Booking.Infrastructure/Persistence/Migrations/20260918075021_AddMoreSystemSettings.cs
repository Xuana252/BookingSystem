using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Booking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMoreSystemSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeSpan>(
                name: "BusinessHoursEnd",
                table: "SystemSettings",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<TimeSpan>(
                name: "BusinessHoursStart",
                table: "SystemSettings",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<int>(
                name: "MaxDurationHours",
                table: "SystemSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "SystemSettings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "SystemSettings",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "BusinessHoursEnd", "BusinessHoursStart", "MaxDurationHours", "TimeZoneId" },
                values: new object[] { new TimeSpan(0, 18, 0, 0, 0), new TimeSpan(0, 8, 0, 0, 0), 4, "Asia/Ho_Chi_Minh" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessHoursEnd",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "BusinessHoursStart",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "MaxDurationHours",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "SystemSettings");
        }
    }
}
