namespace AuthBackend.Models;

public class Employee
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Индивидуальное начало рабочего дня. Null — берётся глобальная настройка.</summary>
    public TimeOnly? WorkStartTime { get; set; }

    /// <summary>Индивидуальный конец рабочего дня. Null — берётся глобальная настройка.</summary>
    public TimeOnly? WorkEndTime { get; set; }

    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}
