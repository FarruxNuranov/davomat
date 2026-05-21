using AuthBackend.Data;
using AuthBackend.DTOs;
using AuthBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthBackend.Services;

public class AttendanceService : IAttendanceService
{
    private const int MaxScreenshots = 5;
    private const long MaxFileBytes = 5 * 1024 * 1024;

    private readonly AppDbContext _db;
    private readonly ISettingsService _settings;
    private readonly IWebHostEnvironment _env;

    public AttendanceService(AppDbContext db, ISettingsService settings, IWebHostEnvironment env)
    {
        _db = db;
        _settings = settings;
        _env = env;
    }

    private string ScreenshotsDir => Path.Combine(_env.ContentRootPath, "Uploads", "screenshots");

    public async Task<List<AttendanceDayRowDto>> GetDayAsync(DateOnly date)
    {
        var settings = await _settings.GetAsync();

        var employees = await _db.Employees
            .OrderBy(e => e.LastName)
            .ThenBy(e => e.FirstName)
            .ToListAsync();

        var records = await _db.Attendance
            .Include(a => a.Screenshots)
            .Where(a => a.Date == date)
            .ToListAsync();

        var byEmployee = records.ToDictionary(r => r.EmployeeId);

        return employees.Select(e =>
        {
            byEmployee.TryGetValue(e.Id, out var rec);
            return new AttendanceDayRowDto
            {
                EmployeeId = e.Id,
                FirstName = e.FirstName,
                LastName = e.LastName,
                Position = e.Position,
                WorkStartTime = e.WorkStartTime ?? settings.WorkStartTime,
                WorkEndTime = e.WorkEndTime ?? settings.WorkEndTime,
                RecordId = rec?.Id,
                ArrivalTime = rec?.ArrivalTime,
                Status = rec?.Status,
                Comment = rec?.Comment,
                AssignedHours = rec?.AssignedHours,
                TaskNames = rec?.TaskNames,
                Screenshots = rec is null ? new() : ToScreenshotDtos(rec)
            };
        }).ToList();
    }

    public async Task<List<AttendanceRecordDto>> GetByEmployeeAsync(int employeeId, DateOnly? from, DateOnly? to)
    {
        var query = _db.Attendance.Include(a => a.Screenshots).Where(a => a.EmployeeId == employeeId);

        if (from is { } f) query = query.Where(a => a.Date >= f);
        if (to is { } t) query = query.Where(a => a.Date <= t);

        return await query
            .OrderByDescending(a => a.Date)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    public async Task<List<AttendanceRecordDto>> GetRangeAsync(DateOnly from, DateOnly to)
    {
        return await _db.Attendance
            .Include(a => a.Screenshots)
            .Where(a => a.Date >= from && a.Date <= to)
            .OrderBy(a => a.Date)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    public async Task<AttendanceRecordDto> UpsertAsync(UpsertAttendanceDto dto)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == dto.EmployeeId)
            ?? throw new KeyNotFoundException("Сотрудник не найден.");

        if (dto.Status is null && dto.ArrivalTime is null)
            throw new ArgumentException("Укажите время прихода или статус.");

        var settings = await _settings.GetAsync();
        var effectiveStart = employee.WorkStartTime ?? settings.WorkStartTime;

        AttendanceStatus status;
        TimeOnly? arrival;

        if (dto.Status is { } explicitStatus)
        {
            status = explicitStatus;
            // Для статусов без фактического прихода время не имеет смысла.
            arrival = explicitStatus is AttendanceStatus.Absent or AttendanceStatus.DayOff or AttendanceStatus.ToWork
                ? null
                : dto.ArrivalTime;
        }
        else
        {
            arrival = dto.ArrivalTime;
            var lateThreshold = effectiveStart.AddMinutes(settings.LateAfterMinutes);
            status = arrival!.Value <= lateThreshold ? AttendanceStatus.OnTime : AttendanceStatus.Late;
        }

        var record = await _db.Attendance
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == dto.Date);

        if (record is null)
        {
            record = new AttendanceRecord
            {
                EmployeeId = dto.EmployeeId,
                Date = dto.Date,
                CreatedAt = DateTime.UtcNow
            };
            _db.Attendance.Add(record);
        }

        record.ArrivalTime = arrival;
        record.Status = status;
        record.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        if (status == AttendanceStatus.ToWork) record.AssignedHours = dto.AssignedHours;
        record.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(record);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var record = await _db.Attendance.Include(a => a.Screenshots).FirstOrDefaultAsync(a => a.Id == id);
        if (record is null) return false;

        DeleteScreenshotFiles(record.Screenshots);
        _db.Attendance.Remove(record);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AttendanceRecordDto> FulfillAsync(int recordId, int employeeId, string? taskNames, IReadOnlyList<IFormFile> files)
    {
        var record = await _db.Attendance.Include(a => a.Screenshots).FirstOrDefaultAsync(a => a.Id == recordId)
            ?? throw new KeyNotFoundException("Отметка не найдена.");

        if (record.EmployeeId != employeeId)
            throw new UnauthorizedAccessException("Это не ваша задача.");

        var slotsLeft = MaxScreenshots - record.Screenshots.Count;
        if (files is { Count: > 0 })
        {
            Directory.CreateDirectory(ScreenshotsDir);
            foreach (var file in files)
            {
                if (slotsLeft <= 0) break;
                if (file.Length == 0) continue;
                if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException("Можно загружать только изображения.");
                if (file.Length > MaxFileBytes)
                    throw new ArgumentException("Размер файла не должен превышать 5 МБ.");

                var ext = Path.GetExtension(file.FileName);
                var stored = $"{Guid.NewGuid():N}{ext}";
                await using (var fs = File.Create(Path.Combine(ScreenshotsDir, stored)))
                {
                    await file.CopyToAsync(fs);
                }

                record.Screenshots.Add(new AttendanceScreenshot
                {
                    StoredFileName = stored,
                    OriginalName = Path.GetFileName(file.FileName),
                    ContentType = file.ContentType
                });
                slotsLeft--;
            }
        }

        if (taskNames is not null)
            record.TaskNames = string.IsNullOrWhiteSpace(taskNames) ? null : taskNames.Trim();

        record.Status = AttendanceStatus.Worked;
        record.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(record);
    }

    public async Task<ScreenshotFile?> GetScreenshotFileAsync(int id)
    {
        var shot = await _db.AttendanceScreenshots
            .Include(s => s.AttendanceRecord)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (shot is null) return null;

        var path = Path.Combine(ScreenshotsDir, shot.StoredFileName);
        if (!File.Exists(path)) return null;

        var bytes = await File.ReadAllBytesAsync(path);
        return new ScreenshotFile(bytes, shot.ContentType, shot.OriginalName, shot.AttendanceRecord.EmployeeId);
    }

    private void DeleteScreenshotFiles(IEnumerable<AttendanceScreenshot> shots)
    {
        foreach (var s in shots)
        {
            var path = Path.Combine(ScreenshotsDir, s.StoredFileName);
            if (File.Exists(path)) File.Delete(path);
        }
    }

    private static List<ScreenshotDto> ToScreenshotDtos(AttendanceRecord a) =>
        a.Screenshots.Select(s => new ScreenshotDto { Id = s.Id, OriginalName = s.OriginalName }).ToList();

    private static AttendanceRecordDto ToDto(AttendanceRecord a) => new()
    {
        Id = a.Id,
        EmployeeId = a.EmployeeId,
        Date = a.Date,
        ArrivalTime = a.ArrivalTime,
        Status = a.Status,
        Comment = a.Comment,
        AssignedHours = a.AssignedHours,
        TaskNames = a.TaskNames,
        Screenshots = ToScreenshotDtos(a),
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt
    };
}
