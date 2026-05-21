namespace AuthBackend.DTOs;

public class AttendanceAnalysisDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string Analysis { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
