namespace AuthBackend.DTOs;

public class EmployeeDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    /// <summary>Индивидуальный график. Null — используется глобальная настройка.</summary>
    public TimeOnly? WorkStartTime { get; set; }
    public TimeOnly? WorkEndTime { get; set; }

    /// <summary>Email для входа сотрудника (если задан логин).</summary>
    public string? LoginEmail { get; set; }
    public bool HasLogin { get; set; }
}
