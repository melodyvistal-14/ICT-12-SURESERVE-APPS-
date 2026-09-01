using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SureserveAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentIdPhotoUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "PushSubscriptions",
                newName: "CreatedAt");

            migrationBuilder.AddColumn<string>(
                name: "StudentIdPhotoUrl",
                table: "StudentProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "P256dh",
                table: "PushSubscriptions",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Auth",
                table: "PushSubscriptions",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StudentIdPhotoUrl",
                table: "StudentProfiles");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "PushSubscriptions",
                newName: "UpdatedAt");

            migrationBuilder.AlterColumn<string>(
                name: "P256dh",
                table: "PushSubscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Auth",
                table: "PushSubscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);
        }
    }
}
