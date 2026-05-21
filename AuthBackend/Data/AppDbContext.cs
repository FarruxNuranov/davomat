using AuthBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AttendanceRecord> Attendance => Set<AttendanceRecord>();
    public DbSet<WorkScheduleSettings> WorkScheduleSettings => Set<WorkScheduleSettings>();
    public DbSet<IntegrationSettings> IntegrationSettings => Set<IntegrationSettings>();
    public DbSet<AttendanceScreenshot> AttendanceScreenshots => Set<AttendanceScreenshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.PhoneNumber)
            .IsUnique();

        modelBuilder.Entity<AttendanceRecord>(b =>
        {
            // Одна отметка на сотрудника в день.
            b.HasIndex(a => new { a.EmployeeId, a.Date }).IsUnique();

            b.HasOne(a => a.Employee)
                .WithMany(e => e.AttendanceRecords)
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            b.Property(a => a.Comment).HasMaxLength(500);
            b.Property(a => a.TaskNames).HasMaxLength(2000);

            b.HasMany(a => a.Screenshots)
                .WithOne(s => s.AttendanceRecord)
                .HasForeignKey(s => s.AttendanceRecordId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>()
            .HasOne(u => u.Employee)
            .WithMany()
            .HasForeignKey(u => u.EmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
