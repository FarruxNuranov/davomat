using AuthBackend.Models;

namespace AuthBackend.DTOs;

/// <summary>
/// Строка таблицы давомата за конкретный день: сотрудник + его отметка (если есть).
/// </summary>
public class AttendanceDayRowDto
{
    public int EmployeeId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;

    /// <summary>Эффективное рабочее время (индивидуальное либо глобальное).</summary>
    public TimeOnly WorkStartTime { get; set; }
    public TimeOnly WorkEndTime { get; set; }

    // Отметка за день (null, если ещё не отмечен).
    public int? RecordId { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public AttendanceStatus? Status { get; set; }
    public string? Comment { get; set; }
    public int? AssignedHours { get; set; }
    public string? TaskNames { get; set; }
    public List<ScreenshotDto> Screenshots { get; set; } = new();
}
