using AuthBackend.Data;
using AuthBackend.DTOs;
using AuthBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AuthBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _db;

    public EmployeesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<EmployeeDto>>> GetAll()
    {
        var employees = await _db.Employees
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var logins = await _db.Users
            .Where(u => u.EmployeeId != null)
            .ToDictionaryAsync(u => u.EmployeeId!.Value, u => u.Email);

        return Ok(employees.Select(e => ToDto(e, logins.GetValueOrDefault(e.Id))).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null) return NotFound();

        var login = await _db.Users.Where(u => u.EmployeeId == id).Select(u => u.Email).FirstOrDefaultAsync();
        return Ok(ToDto(employee, login));
    }

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create([FromBody] CreateEmployeeDto dto)
    {
        if (await _db.Employees.AnyAsync(e => e.PhoneNumber == dto.PhoneNumber))
            return Conflict(new { message = "Phone number is already used." });

        var employee = new Employee
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            Position = dto.Position,
            WorkStartTime = dto.WorkStartTime,
            WorkEndTime = dto.WorkEndTime
        };

        _db.Employees.Add(employee);
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(dto.LoginEmail))
        {
            var error = await UpsertLoginAsync(employee, dto.LoginEmail!, dto.LoginPassword, requirePassword: true);
            if (error is not null) return Conflict(new { message = error });
        }

        var login = await _db.Users.Where(u => u.EmployeeId == employee.Id).Select(u => u.Email).FirstOrDefaultAsync();
        return CreatedAtAction(nameof(GetById), new { id = employee.Id }, ToDto(employee, login));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> Update(int id, [FromBody] UpdateEmployeeDto dto)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null) return NotFound();

        if (await _db.Employees.AnyAsync(e => e.PhoneNumber == dto.PhoneNumber && e.Id != id))
            return Conflict(new { message = "Phone number is already used by another employee." });

        employee.FirstName = dto.FirstName;
        employee.LastName = dto.LastName;
        employee.PhoneNumber = dto.PhoneNumber;
        employee.Position = dto.Position;
        employee.WorkStartTime = dto.WorkStartTime;
        employee.WorkEndTime = dto.WorkEndTime;
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(dto.LoginEmail))
        {
            var error = await UpsertLoginAsync(employee, dto.LoginEmail!, dto.LoginPassword, requirePassword: false);
            if (error is not null) return Conflict(new { message = error });
        }

        var login = await _db.Users.Where(u => u.EmployeeId == id).Select(u => u.Email).FirstOrDefaultAsync();
        return Ok(ToDto(employee, login));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null) return NotFound();

        // Связанный логин удаляем вместе с сотрудником.
        var users = await _db.Users.Where(u => u.EmployeeId == id).ToListAsync();
        _db.Users.RemoveRange(users);
        _db.Employees.Remove(employee);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Создаёт/обновляет логин-пользователя для сотрудника. Возвращает текст ошибки или null.</summary>
    private async Task<string?> UpsertLoginAsync(Employee employee, string email, string? password, bool requirePassword)
    {
        email = email.Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmployeeId == employee.Id);

        // Email должен быть уникальным среди всех пользователей.
        var emailTaken = await _db.Users.AnyAsync(u => u.Email == email && u.EmployeeId != employee.Id);
        if (emailTaken) return "Этот email уже используется.";

        if (user is null)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                return requirePassword
                    ? "Для входа сотрудника укажите пароль не короче 8 символов."
                    : "Чтобы создать вход, укажите пароль не короче 8 символов.";

            user = new User
            {
                Email = email,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                PhoneNumber = employee.PhoneNumber,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = "Employee",
                EmployeeId = employee.Id
            };
            _db.Users.Add(user);
        }
        else
        {
            user.Email = email;
            user.FirstName = employee.FirstName;
            user.LastName = employee.LastName;
            user.PhoneNumber = employee.PhoneNumber;
            if (!string.IsNullOrWhiteSpace(password))
            {
                if (password.Length < 8) return "Пароль не короче 8 символов.";
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            }
        }

        await _db.SaveChangesAsync();
        return null;
    }

    private static EmployeeDto ToDto(Employee e, string? loginEmail) => new()
    {
        Id = e.Id,
        FirstName = e.FirstName,
        LastName = e.LastName,
        PhoneNumber = e.PhoneNumber,
        Position = e.Position,
        CreatedAt = e.CreatedAt,
        WorkStartTime = e.WorkStartTime,
        WorkEndTime = e.WorkEndTime,
        LoginEmail = loginEmail,
        HasLogin = loginEmail is not null
    };
}
