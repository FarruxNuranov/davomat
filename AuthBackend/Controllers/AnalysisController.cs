using AuthBackend.DTOs;
using AuthBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalysisController : ControllerBase
{
    private readonly IAnalysisService _analysis;

    public AnalysisController(IAnalysisService analysis)
    {
        _analysis = analysis;
    }

    /// <summary>ИИ-сводка по давомату за месяц (по умолчанию — текущий).</summary>
    [HttpGet("attendance")]
    public async Task<ActionResult<AttendanceAnalysisDto>> Attendance(
        [FromQuery] int? year, [FromQuery] int? month, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        if (m < 1 || m > 12) return BadRequest(new { message = "Некорректный месяц." });

        try
        {
            var result = await _analysis.AnalyzeMonthAsync(y, m, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            // ИИ не настроен (нет ключа).
            return StatusCode(503, new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { message = "Ошибка обращения к Anthropic API.", detail = ex.Message });
        }
    }
}
