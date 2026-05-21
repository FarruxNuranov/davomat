namespace AuthBackend.Models;

public class AttendanceRecord
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    /// <summary>День, к которому относится отметка.</summary>
    public DateOnly Date { get; set; }

    /// <summary>Фактическое время прихода. Null, если сотрудник отсутствовал.</summary>
    public TimeOnly? ArrivalTime { get; set; }

    public AttendanceStatus Status { get; set; }

    /// <summary>Необязательный комментарий (например, причина отгула).</summary>
    public string? Comment { get; set; }

    /// <summary>Назначенное количество часов (для статуса «Должен отработать»).</summary>
    public int? AssignedHours { get; set; }

    /// <summary>Названия/ссылки задач (Jira/YouTrack), которые заполняет сотрудник.</summary>
    public string? TaskNames { get; set; }

    public ICollection<AttendanceScreenshot> Screenshots { get; set; } = new List<AttendanceScreenshot>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
