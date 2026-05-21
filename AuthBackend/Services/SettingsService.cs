using AuthBackend.Data;
using AuthBackend.DTOs;
using AuthBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthBackend.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;

    public SettingsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<WorkScheduleSettings> GetAsync()
    {
        var settings = await _db.WorkScheduleSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new WorkScheduleSettings();
            _db.WorkScheduleSettings.Add(settings);
            await _db.SaveChangesAsync();
        }
        return settings;
    }

    public async Task<WorkScheduleSettingsDto> GetDtoAsync()
    {
        var s = await GetAsync();
        return ToDto(s);
    }

    public async Task<WorkScheduleSettingsDto> UpdateAsync(UpdateWorkScheduleSettingsDto dto)
    {
        var s = await GetAsync();
        s.WorkStartTime = dto.WorkStartTime;
        s.WorkEndTime = dto.WorkEndTime;
        s.LateAfterMinutes = dto.LateAfterMinutes;
        await _db.SaveChangesAsync();
        return ToDto(s);
    }

    private static WorkScheduleSettingsDto ToDto(WorkScheduleSettings s) => new()
    {
        WorkStartTime = s.WorkStartTime,
        WorkEndTime = s.WorkEndTime,
        LateAfterMinutes = s.LateAfterMinutes
    };

    public async Task<IntegrationSettings> GetIntegrationsAsync()
    {
        var settings = await _db.IntegrationSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new IntegrationSettings();
            _db.IntegrationSettings.Add(settings);
            await _db.SaveChangesAsync();
        }
        return settings;
    }

    public async Task<IntegrationSettingsDto> GetIntegrationsDtoAsync()
    {
        var s = await GetIntegrationsAsync();
        return new IntegrationSettingsDto
        {
            AnthropicConfigured = !string.IsNullOrWhiteSpace(s.AnthropicApiKey),
            AnthropicKeyMasked = Mask(s.AnthropicApiKey),
            AnthropicModel = s.AnthropicModel,
            TelegramConfigured = !string.IsNullOrWhiteSpace(s.TelegramBotToken),
            TelegramTokenMasked = Mask(s.TelegramBotToken),
            TelegramChatId = s.TelegramChatId ?? string.Empty
        };
    }

    public async Task<IntegrationSettingsDto> UpdateIntegrationsAsync(UpdateIntegrationSettingsDto dto)
    {
        var s = await GetIntegrationsAsync();

        // Пустые секреты не перезаписывают сохранённые.
        if (!string.IsNullOrWhiteSpace(dto.AnthropicApiKey)) s.AnthropicApiKey = dto.AnthropicApiKey.Trim();
        if (!string.IsNullOrWhiteSpace(dto.AnthropicModel)) s.AnthropicModel = dto.AnthropicModel.Trim();
        if (!string.IsNullOrWhiteSpace(dto.TelegramBotToken)) s.TelegramBotToken = dto.TelegramBotToken.Trim();

        // ID чата не секрет — можно задать или очистить явно.
        if (dto.TelegramChatId is not null)
            s.TelegramChatId = string.IsNullOrWhiteSpace(dto.TelegramChatId) ? null : dto.TelegramChatId.Trim();

        await _db.SaveChangesAsync();
        return await GetIntegrationsDtoAsync();
    }

    private static string Mask(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret)) return string.Empty;
        var last = secret.Length <= 4 ? secret : secret[^4..];
        return "•••• " + last;
    }
}
