namespace AuthBackend.Models;

/// <summary>
/// Настройки внешних интеграций (одна строка, Id = 1).
/// Секреты хранятся здесь и редактируются через UI; при пустом значении
/// сервисы откатываются на конфигурацию/user-secrets.
/// </summary>
public class IntegrationSettings
{
    public int Id { get; set; }

    public string? AnthropicApiKey { get; set; }
    public string AnthropicModel { get; set; } = "claude-opus-4-7";

    public string? TelegramBotToken { get; set; }
    public string? TelegramChatId { get; set; }
}
