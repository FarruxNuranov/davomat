using AuthBackend.Models;

namespace AuthBackend.DTOs;

public class AttendanceRecordDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Comment { get; set; }
    public int? AssignedHours { get; set; }
    public string? TaskNames { get; set; }
    public List<ScreenshotDto> Screenshots { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ScreenshotDto
{
    public int Id { get; set; }
    public string OriginalName { get; set; } = string.Empty;
}
