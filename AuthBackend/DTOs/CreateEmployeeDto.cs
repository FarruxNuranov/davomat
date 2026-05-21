using System.ComponentModel.DataAnnotations;

namespace AuthBackend.DTOs;

public class CreateEmployeeDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [Phone]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    public string Position { get; set; } = string.Empty;

    /// <summary>Необязательный индивидуальный график. Null — глобальная настройка.</summary>
    public TimeOnly? WorkStartTime { get; set; }
    public TimeOnly? WorkEndTime { get; set; }

    /// <summary>Логин сотрудника (необязательно). Если задан email и пароль — создаётся вход.</summary>
    [EmailAddress]
    public string? LoginEmail { get; set; }
    public string? LoginPassword { get; set; }
}
