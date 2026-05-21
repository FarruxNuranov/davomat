namespace AuthBackend.DTOs;

/// <summary>Ответ клиенту: секреты не отдаём, только маску и флаг «настроено».</summary>
public class IntegrationSettingsDto
{
    public bool AnthropicConfigured { get; set; }
    public string AnthropicKeyMasked { get; set; } = string.Empty;
    public string AnthropicModel { get; set; } = string.Empty;

    public bool TelegramConfigured { get; set; }
    public string TelegramTokenMasked { get; set; } = string.Empty;
    public string TelegramChatId { get; set; } = string.Empty;
}

/// <summary>
/// Запрос на обновление. Пустые/null секреты НЕ перезаписывают сохранённые
/// (чтобы можно было менять одно поле, не вводя ключ заново).
/// </summary>
public class UpdateIntegrationSettingsDto
{
    public string? AnthropicApiKey { get; set; }
    public string? AnthropicModel { get; set; }
    public string? TelegramBotToken { get; set; }
    public string? TelegramChatId { get; set; }
}
