using AuthBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TelegramController : ControllerBase
{
    private readonly ITelegramService _telegram;

    public TelegramController(ITelegramService telegram)
    {
        _telegram = telegram;
    }

    /// <summary>Отправить отчёт по давомату за день (по умолчанию — сегодня) в Telegram.</summary>
    [HttpPost("send-report")]
    public async Task<IActionResult> SendReport([FromQuery] DateOnly? date, CancellationToken ct)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.Today);
        try
        {
            await _telegram.SendDailyReportAsync(d, ct);
            return Ok(new { message = "Отчёт отправлен в Telegram." });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { message = "Ошибка отправки в Telegram.", detail = ex.Message });
        }
    }
}
