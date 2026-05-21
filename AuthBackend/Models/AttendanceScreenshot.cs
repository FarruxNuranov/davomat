namespace AuthBackend.Models;

/// <summary>Скриншот-подтверждение работы, прикреплённый сотрудником к отметке.</summary>
public class AttendanceScreenshot
{
    public int Id { get; set; }

    public int AttendanceRecordId { get; set; }
    public AttendanceRecord AttendanceRecord { get; set; } = null!;

    /// <summary>Имя файла на диске (uploads/screenshots).</summary>
    public string StoredFileName { get; set; } = string.Empty;

    /// <summary>Исходное имя файла.</summary>
    public string OriginalName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
