using AuthBackend.Data;
using AuthBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthBackend.Services;

public static class AdminSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config, ILogger logger)
    {
        if (await db.Users.AnyAsync()) return;

        var section = config.GetSection("Admin");
        var email = section["Email"] ?? "admin@local.dev";
        var password = section["Password"] ?? "Admin12345";
        var firstName = section["FirstName"] ?? "System";
        var lastName = section["LastName"] ?? "Admin";
        var phone = section["PhoneNumber"] ?? "+0000000000";

        if (password.Length < 8)
            throw new InvalidOperationException("Admin:Password must be at least 8 characters.");

        var admin = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            PhoneNumber = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = "Admin"
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();

        logger.LogWarning("Seeded system admin: {Email} (change the default password!)", email);
    }

    /// <summary>Гарантирует, что у администратора (по Admin:Email) роль "Admin".</summary>
    public static async Task EnsureAdminRoleAsync(AppDbContext db, IConfiguration config)
    {
        var email = config.GetSection("Admin")["Email"] ?? "admin@local.dev";
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (admin is not null && admin.Role != "Admin")
        {
            admin.Role = "Admin";
            await db.SaveChangesAsync();
        }
    }
}
