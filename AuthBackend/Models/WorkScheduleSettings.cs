namespace AuthBackend.Models;

/// <summary>
/// Глобальные настройки рабочего графика (одна строка, Id = 1).
/// Используются как значения по умолчанию, если у сотрудника не задан свой график.
/// </summary>
public class WorkScheduleSettings
{
    public int Id { get; set; }

    /// <summary>Начало рабочего дня по умолчанию.</summary>
    public TimeOnly WorkStartTime { get; set; } = new(9, 0);

    /// <summary>Конец рабочего дня по умолчанию.</summary>
    public TimeOnly WorkEndTime { get; set; } = new(18, 0);

    /// <summary>Допустимое опоздание в минутах: приход в пределах N минут после старта ещё «вовремя».</summary>
    public int LateAfterMinutes { get; set; } = 0;
}
