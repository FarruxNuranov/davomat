using AuthBackend.DTOs;

namespace AuthBackend.Services;

public interface IAttendanceService
{
    /// <summary>Таблица давомата за день: все сотрудники + их отметки (если есть).</summary>
    Task<List<AttendanceDayRowDto>> GetDayAsync(DateOnly date);

    /// <summary>История отметок одного сотрудника (опционально за период).</summary>
    Task<List<AttendanceRecordDto>> GetByEmployeeAsync(int employeeId, DateOnly? from, DateOnly? to);

    /// <summary>Все отметки всех сотрудников за период (для месячной сетки давомата).</summary>
    Task<List<AttendanceRecordDto>> GetRangeAsync(DateOnly from, DateOnly to);

    /// <summary>Создаёт или обновляет отметку за день. Статус вычисляется по времени, если не задан явно.</summary>
    Task<AttendanceRecordDto> UpsertAsync(UpsertAttendanceDto dto);

    Task<bool> DeleteAsync(int id);

    /// <summary>Сотрудник выполняет задачу: прикрепляет скрины + названия задач, статус становится «Отработано».</summary>
    Task<AttendanceRecordDto> FulfillAsync(int recordId, int employeeId, string? taskNames, IReadOnlyList<IFormFile> files);

    /// <summary>Содержимое скриншота для отдачи клиенту (с проверкой владельца на уровне контроллера).</summary>
    Task<ScreenshotFile?> GetScreenshotFileAsync(int id);
}

public record ScreenshotFile(byte[] Content, string ContentType, string FileName, int EmployeeId);
