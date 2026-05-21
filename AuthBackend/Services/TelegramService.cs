using System.Text;
using System.Text.Json;
using AuthBackend.Models;
using AuthBackend.Services;

namespace AuthBackend.Services;

public class TelegramService : ITelegramService
{
    private static readonly Dictionary<AttendanceStatus, string> StatusLabel = new()
    {
        [AttendanceStatus.OnTime] = "✅ Вовремя",
        [AttendanceStatus.Late] = "🟠 Опоздал",
        [AttendanceStatus.Excused] = "🔵 Отпросился",
        [AttendanceStatus.Absent] = "🔴 Отсутствовал",
        [AttendanceStatus.LeftEarly] = "🟣 Ушёл раньше",
        [AttendanceStatus.DayOff] = "⚪ Выходной",
        [AttendanceStatus.Worked] = "🟢 Отработано",
        [AttendanceStatus.ToWork] = "🟡 Должен отработать"
    };

    private readonly HttpClient _http;
    private readonly IAttendanceService _attendance;
    private readonly ISettingsService _settings;
    private readonly IConfiguration _config;

    public TelegramService(
        HttpClient http,
        IAttendanceService attendance,
        ISettingsService settings,
        IConfiguration config)
    {
        _http = http;
        _attendance = attendance;
        _settings = settings;
        _config = config;
    }

    public async Task SendDailyReportAsync(DateOnly date, CancellationToken ct = default)
    {
        var integrations = await _settings.GetIntegrationsAsync();
        var token = !string.IsNullOrWhiteSpace(integrations.TelegramBotToken)
            ? integrations.TelegramBotToken
            : _config["Telegram:BotToken"];
        var chatId = !string.IsNullOrWhiteSpace(integrations.TelegramChatId)
            ? integrations.TelegramChatId
            : _config["Telegram:ChatId"];

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(chatId))
            throw new InvalidOperationException(
                "Telegram не настроен: укажите токен бота и ID чата в Настройки → Интеграции.");

        var text = await BuildReportAsync(date);

        object chatIdValue = long.TryParse(chatId, out var idNum) ? idNum : chatId;
        var payload = new { chat_id = chatIdValue, text, disable_web_page_preview = true };
        var json = JsonSerializer.Serialize(payload);

        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await _http.PostAsync($"bot{token}/sendMessage", content, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Telegram API вернул {(int)response.StatusCode}: {body}");
    }

    private async Task<string> BuildReportAsync(DateOnly date)
    {
        var rows = await _attendance.GetDayAsync(date);

        var counts = new Dictionary<AttendanceStatus, int>();
        var notMarked = 0;
        foreach (var r in rows)
        {
            if (r.Status is { } s) counts[s] = counts.GetValueOrDefault(s) + 1;
            else notMarked++;
        }

        var sb = new StringBuilder();
        sb.AppendLine($"📋 Давомат — {date:dd.MM.yyyy} ({DayOfWeekRu(date)})");
        sb.AppendLine();

        var summaryParts = StatusLabel
            .Where(kv => counts.ContainsKey(kv.Key))
            .Select(kv => $"{kv.Value}: {counts[kv.Key]}")
            .ToList();
        if (notMarked > 0) summaryParts.Add($"⬜ Не отмечен: {notMarked}");
        sb.AppendLine(summaryParts.Count > 0 ? string.Join("\n", summaryParts) : "Сотрудников нет.");

        if (rows.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Детали:");
            foreach (var r in rows)
            {
                var label = r.Status is { } s ? StatusLabel[s] : "⬜ Не отмечен";
                var time = r.ArrivalTime is { } a ? $" ({a:HH\\:mm})" : "";
                sb.AppendLine($"• {r.LastName} {r.FirstName} — {label}{time}");
            }
        }

        return sb.ToString();
    }

    private static string DayOfWeekRu(DateOnly date) =>
        date.DayOfWeek switch
        {
            DayOfWeek.Monday => "Пн",
            DayOfWeek.Tuesday => "Вт",
            DayOfWeek.Wednesday => "Ср",
            DayOfWeek.Thursday => "Чт",
            DayOfWeek.Friday => "Пт",
            DayOfWeek.Saturday => "Сб",
            _ => "Вс"
        };
}
