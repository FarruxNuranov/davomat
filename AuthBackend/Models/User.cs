namespace AuthBackend.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }

    /// <summary>Роль: "Admin" или "Employee".</summary>
    public string Role { get; set; } = "Employee";

    /// <summary>Для роли Employee — связанный сотрудник.</summary>
    public int? EmployeeId { get; set; }
    public Employee? Employee { get; set; }
}
