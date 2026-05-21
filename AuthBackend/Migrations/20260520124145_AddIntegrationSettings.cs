using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AuthBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddIntegrationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IntegrationSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AnthropicApiKey = table.Column<string>(type: "TEXT", nullable: true),
                    AnthropicModel = table.Column<string>(type: "TEXT", nullable: false),
                    TelegramBotToken = table.Column<string>(type: "TEXT", nullable: true),
                    TelegramChatId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntegrationSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IntegrationSettings");
        }
    }
}
