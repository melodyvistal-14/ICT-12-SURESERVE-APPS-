using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SureserveAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddStallImageUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StallImageUrl",
                table: "VendorProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StallImageUrl",
                table: "VendorProfiles");
        }
    }
}
