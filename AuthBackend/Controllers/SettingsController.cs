using AuthBackend.DTOs;
using AuthBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settings;

    public SettingsController(ISettingsService settings)
    {
        _settings = settings;
    }

    [HttpGet("work-schedule")]
    public async Task<ActionResult<WorkScheduleSettingsDto>> GetWorkSchedule()
    {
        return Ok(await _settings.GetDtoAsync());
    }

    [HttpPut("work-schedule")]
    public async Task<ActionResult<WorkScheduleSettingsDto>> UpdateWorkSchedule(
        [FromBody] UpdateWorkScheduleSettingsDto dto)
    {
        if (dto.WorkEndTime <= dto.WorkStartTime)
            return BadRequest(new { message = "Конец рабочего дня должен быть позже начала." });

        return Ok(await _settings.UpdateAsync(dto));
    }

    [HttpGet("integrations")]
    public async Task<ActionResult<IntegrationSettingsDto>> GetIntegrations()
    {
        return Ok(await _settings.GetIntegrationsDtoAsync());
    }

    [HttpPut("integrations")]
    public async Task<ActionResult<IntegrationSettingsDto>> UpdateIntegrations(
        [FromBody] UpdateIntegrationSettingsDto dto)
    {
        return Ok(await _settings.UpdateIntegrationsAsync(dto));
    }
}
