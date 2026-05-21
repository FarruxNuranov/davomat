namespace AuthBackend.Services;

public interface ITelegramService
{
    /// <summary>Отправляет в настроенный Telegram-чат отчёт по давомату за указанный день.</summary>
    Task SendDailyReportAsync(DateOnly date, CancellationToken ct = default);
}
