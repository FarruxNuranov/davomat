using System.ComponentModel.DataAnnotations;
using AuthBackend.Models;

namespace AuthBackend.DTOs;

/// <summary>
/// Создание/обновление отметки за день.
/// Если задан Status (отпросился/отсутствовал/ушёл раньше) — он используется как есть.
/// Если Status не задан — статус «вовремя/опоздал» вычисляется по ArrivalTime и графику.
/// </summary>
public class UpsertAttendanceDto
{
    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    public TimeOnly? ArrivalTime { get; set; }

    public AttendanceStatus? Status { get; set; }

    [MaxLength(500)]
    public string? Comment { get; set; }

    /// <summary>Назначенные часы (для статуса «Должен отработать»).</summary>
    public int? AssignedHours { get; set; }
}
