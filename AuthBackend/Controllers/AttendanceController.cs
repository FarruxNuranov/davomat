using System.Security.Claims;
using AuthBackend.DTOs;
using AuthBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendance;

    public AttendanceController(IAttendanceService attendance)
    {
        _attendance = attendance;
    }

    private int? CurrentEmployeeId =>
        int.TryParse(User.FindFirst("employeeId")?.Value, out var id) ? id : null;

    // ===== Админ =====

    /// <summary>Таблица давомата за день (по умолчанию — сегодня).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<AttendanceDayRowDto>>> GetDay([FromQuery] DateOnly? date)
    {
        var day = date ?? DateOnly.FromDateTime(DateTime.Today);
        return Ok(await _attendance.GetDayAsync(day));
    }

    /// <summary>Все отметки за период (для месячной сетки).</summary>
    [HttpGet("range")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<AttendanceRecordDto>>> GetRange(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        if (to < from)
            return BadRequest(new { message = "Дата окончания не может быть раньше даты начала." });

        return Ok(await _attendance.GetRangeAsync(from, to));
    }

    /// <summary>История отметок одного сотрудника.</summary>
    [HttpGet("employee/{employeeId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<AttendanceRecordDto>>> GetByEmployee(
        int employeeId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        return Ok(await _attendance.GetByEmployeeAsync(employeeId, from, to));
    }

    /// <summary>Создать/обновить отметку за день (включая «Должен отработать» с часами).</summary>
    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AttendanceRecordDto>> Upsert([FromBody] UpsertAttendanceDto dto)
    {
        try
        {
            return Ok(await _attendance.UpsertAsync(dto));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _attendance.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // ===== Сотрудник =====

    /// <summary>Свои отметки за период (для роли Employee). По умолчанию — текущий месяц.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<List<AttendanceRecordDto>>> My(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        if (CurrentEmployeeId is not { } employeeId)
            return BadRequest(new { message = "Этот раздел доступен только сотрудникам." });

        var today = DateOnly.FromDateTime(DateTime.Today);
        var f = from ?? new DateOnly(today.Year, today.Month, 1);
        var t = to ?? new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month));
        return Ok(await _attendance.GetByEmployeeAsync(employeeId, f, t));
    }

    /// <summary>Сотрудник выполняет задачу: до 5 скринов + названия задач → статус «Отработано».</summary>
    [HttpPost("{id:int}/fulfill")]
    public async Task<ActionResult<AttendanceRecordDto>> Fulfill(
        int id, [FromForm] string? taskNames, [FromForm] List<IFormFile>? files)
    {
        if (CurrentEmployeeId is not { } employeeId)
            return BadRequest(new { message = "Доступно только сотрудникам." });

        try
        {
            var result = await _attendance.FulfillAsync(id, employeeId, taskNames, files ?? new List<IFormFile>());
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Отдаёт файл скриншота (админ — любой, сотрудник — только свой).</summary>
    [HttpGet("screenshot/{id:int}")]
    public async Task<IActionResult> Screenshot(int id)
    {
        var file = await _attendance.GetScreenshotFileAsync(id);
        if (file is null) return NotFound();

        if (!User.IsInRole("Admin") && CurrentEmployeeId != file.EmployeeId)
            return StatusCode(403);

        return File(file.Content, file.ContentType, file.FileName);
    }
}
