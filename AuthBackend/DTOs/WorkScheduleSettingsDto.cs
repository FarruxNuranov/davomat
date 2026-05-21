using System.ComponentModel.DataAnnotations;

namespace AuthBackend.DTOs;

public class WorkScheduleSettingsDto
{
    public TimeOnly WorkStartTime { get; set; }
    public TimeOnly WorkEndTime { get; set; }
    public int LateAfterMinutes { get; set; }
}

public class UpdateWorkScheduleSettingsDto
{
    [Required]
    public TimeOnly WorkStartTime { get; set; }

    [Required]
    public TimeOnly WorkEndTime { get; set; }

    [Range(0, 240, ErrorMessage = "Допустимое опоздание должно быть от 0 до 240 минут.")]
    public int LateAfterMinutes { get; set; }
}
