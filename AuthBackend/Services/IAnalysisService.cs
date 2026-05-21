using AuthBackend.DTOs;

namespace AuthBackend.Services;

public interface IAnalysisService
{
    /// <summary>Собирает давомат за месяц и запрашивает у Claude аналитическую сводку на русском.</summary>
    Task<AttendanceAnalysisDto> AnalyzeMonthAsync(int year, int month, CancellationToken ct = default);
}
