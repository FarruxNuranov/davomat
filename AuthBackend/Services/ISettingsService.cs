using AuthBackend.DTOs;
using AuthBackend.Models;

namespace AuthBackend.Services;

public interface ISettingsService
{
    /// <summary>Возвращает глобальные настройки графика, создавая строку по умолчанию при первом обращении.</summary>
    Task<WorkScheduleSettings> GetAsync();

    Task<WorkScheduleSettingsDto> GetDtoAsync();

    Task<WorkScheduleSettingsDto> UpdateAsync(UpdateWorkScheduleSettingsDto dto);

    /// <summary>Настройки интеграций (создаёт строку по умолчанию при первом обращении).</summary>
    Task<IntegrationSettings> GetIntegrationsAsync();

    /// <summary>Безопасное представление для клиента (маска секретов).</summary>
    Task<IntegrationSettingsDto> GetIntegrationsDtoAsync();

    Task<IntegrationSettingsDto> UpdateIntegrationsAsync(UpdateIntegrationSettingsDto dto);
}
