using System.Globalization;
using System.Text;
using System.Text.Json;
using AuthBackend.Data;
using AuthBackend.DTOs;
using AuthBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthBackend.Services;

public class AnalysisService : IAnalysisService
{
    private static readonly string[] MonthNames =
    {
        "", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    };

    private static readonly Dictionary<AttendanceStatus, string> StatusRu = new()
    {
        [AttendanceStatus.OnTime] = "вовремя",
        [AttendanceStatus.Late] = "опоздал",
        [AttendanceStatus.Excused] = "отпросился",
        [AttendanceStatus.Absent] = "отсутствовал",
        [AttendanceStatus.LeftEarly] = "ушёл раньше",
        [AttendanceStatus.DayOff] = "выходной",
        [AttendanceStatus.Worked] = "отработано",
        [AttendanceStatus.ToWork] = "должен отработать"
    };

    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly IAttendanceService _attendance;
    private readonly ISettingsService _settings;
    private readonly IConfiguration _config;

    public AnalysisService(
        HttpClient http,
        AppDbContext db,
        IAttendanceService attendance,
        ISettingsService settings,
        IConfiguration config)
    {
        _http = http;
        _db = db;
        _attendance = attendance;
        _settings = settings;
        _config = config;
    }

    public async Task<AttendanceAnalysisDto> AnalyzeMonthAsync(int year, int month, CancellationToken ct = default)
    {
        var integrations = await _settings.GetIntegrationsAsync();

        var apiKey = !string.IsNullOrWhiteSpace(integrations.AnthropicApiKey)
            ? integrations.AnthropicApiKey
            : _config["Anthropic:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException(
                "ИИ-аналитика не настроена: укажите API-ключ Claude в Настройки → Интеграции.");

        var model = !string.IsNullOrWhiteSpace(integrations.AnthropicModel)
            ? integrations.AnthropicModel
            : _config["Anthropic:Model"];
        if (string.IsNullOrWhiteSpace(model)) model = "claude-opus-4-7";

        var data = await BuildDataAsync(year, month);

        var systemPrompt =
            "Ты — опытный HR-аналитик. На основе данных о посещаемости сотрудников (давомат) за месяц " +
            "составь краткий деловой отчёт на русском языке. Структура отчёта:\n" +
            "1. Общая сводка по команде.\n" +
            "2. Сотрудники с частыми опозданиями или отсутствиями (с конкретными цифрами).\n" +
            "3. Замеченные закономерности и аномалии (например, регулярные опоздания по понедельникам).\n" +
            "4. Практические рекомендации.\n\n" +
            "Опирайся только на предоставленные данные, ничего не выдумывай. Если данных мало — так и скажи. " +
            "Оформи ответ в Markdown с заголовками и списками.";

        var requestBody = new
        {
            model,
            max_tokens = 2048,
            system = systemPrompt,
            messages = new[]
            {
                new { role = "user", content = data }
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        using var request = new HttpRequestMessage(HttpMethod.Post, "v1/messages");
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _http.SendAsync(request, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(
                $"Anthropic API вернул {(int)response.StatusCode}: {responseBody}");

        var analysis = ExtractText(responseBody);

        return new AttendanceAnalysisDto
        {
            Year = year,
            Month = month,
            Analysis = analysis,
            Model = model,
            GeneratedAt = DateTime.UtcNow
        };
    }

    private static string ExtractText(string responseBody)
    {
        using var doc = JsonDocument.Parse(responseBody);
        var sb = new StringBuilder();
        if (doc.RootElement.TryGetProperty("content", out var content))
        {
            foreach (var block in content.EnumerateArray())
            {
                if (block.TryGetProperty("type", out var t) && t.GetString() == "text"
                    && block.TryGetProperty("text", out var text))
                {
                    sb.Append(text.GetString());
                }
            }
        }
        return sb.ToString().Trim();
    }

    private async Task<string> BuildDataAsync(int year, int month)
    {
        var settings = await _settings.GetAsync();
        var from = new DateOnly(year, month, 1);
        var to = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

        var employees = await _db.Employees
            .OrderBy(e => e.LastName)
            .ThenBy(e => e.FirstName)
            .ToListAsync();

        var records = await _attendance.GetRangeAsync(from, to);
        var byEmployee = records.GroupBy(r => r.EmployeeId).ToDictionary(g => g.Key, g => g.ToList());

        var sb = new StringBuilder();
        sb.AppendLine($"Период: {MonthNames[month]} {year} ({from:dd.MM.yyyy}–{to:dd.MM.yyyy}).");
        sb.AppendLine(
            $"График по умолчанию: {settings.WorkStartTime:HH\\:mm}–{settings.WorkEndTime:HH\\:mm}, " +
            $"допустимое опоздание: {settings.LateAfterMinutes} мин.");
        sb.AppendLine($"Всего сотрудников: {employees.Count}.");
        sb.AppendLine();

        if (employees.Count == 0)
            sb.AppendLine("Сотрудников нет.");

        foreach (var e in employees)
        {
            var start = e.WorkStartTime ?? settings.WorkStartTime;
            var end = e.WorkEndTime ?? settings.WorkEndTime;
            sb.AppendLine($"Сотрудник: {e.LastName} {e.FirstName} ({e.Position}), график {start:HH\\:mm}–{end:HH\\:mm}.");

            byEmployee.TryGetValue(e.Id, out var recs);
            recs ??= new List<AttendanceRecordDto>();

            if (recs.Count == 0)
            {
                sb.AppendLine("  Отметок за месяц нет.");
                sb.AppendLine();
                continue;
            }

            var counts = recs.GroupBy(r => r.Status).ToDictionary(g => g.Key, g => g.Count());
            var countParts = StatusRu
                .Where(kv => counts.ContainsKey(kv.Key))
                .Select(kv => $"{kv.Value}: {counts[kv.Key]}");
            sb.AppendLine($"  Итоги — {string.Join(", ", countParts)}. Всего отмечено дней: {recs.Count}.");

            var lates = recs
                .Where(r => r.Status == AttendanceStatus.Late)
                .OrderBy(r => r.Date)
                .Select(r => r.ArrivalTime is { } a
                    ? $"{r.Date:dd.MM} ({DayOfWeekRu(r.Date)}) приход {a:HH\\:mm}"
                    : $"{r.Date:dd.MM} ({DayOfWeekRu(r.Date)})")
                .ToList();
            if (lates.Count > 0)
                sb.AppendLine($"  Опоздания: {string.Join("; ", lates)}.");

            var absences = recs
                .Where(r => r.Status is AttendanceStatus.Absent or AttendanceStatus.Excused or AttendanceStatus.LeftEarly)
                .OrderBy(r => r.Date)
                .Select(r => $"{r.Date:dd.MM} {StatusRu[r.Status]}" +
                             (string.IsNullOrWhiteSpace(r.Comment) ? "" : $" ({r.Comment})"))
                .ToList();
            if (absences.Count > 0)
                sb.AppendLine($"  Прочее: {string.Join("; ", absences)}.");

            sb.AppendLine();
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
