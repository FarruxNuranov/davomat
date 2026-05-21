namespace AuthBackend.Models;

public enum AttendanceStatus
{
    /// <summary>Пришёл вовремя.</summary>
    OnTime = 0,

    /// <summary>Опоздал.</summary>
    Late = 1,

    /// <summary>Отпросился.</summary>
    Excused = 2,

    /// <summary>Отсутствовал (прогул).</summary>
    Absent = 3,

    /// <summary>Ушёл раньше.</summary>
    LeftEarly = 4,

    /// <summary>Выходной / отгул.</summary>
    DayOff = 5,

    /// <summary>Отработал / задание выполнено.</summary>
    Worked = 6,

    /// <summary>Должен отработать (назначено админом, с количеством часов).</summary>
    ToWork = 7
}
