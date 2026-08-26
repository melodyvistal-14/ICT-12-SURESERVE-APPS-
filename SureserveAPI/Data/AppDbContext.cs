using Microsoft.EntityFrameworkCore;
using SureserveAPI.Models;

namespace SureserveAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<VendorProfile> VendorProfiles => Set<VendorProfile>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<VendorPasskey> VendorPasskeys => Set<VendorPasskey>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User - StudentProfile (1:1)
        modelBuilder.Entity<User>()
            .HasOne(u => u.StudentProfile)
            .WithOne(sp => sp.User)
            .HasForeignKey<StudentProfile>(sp => sp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // User - VendorProfile (1:1)
        modelBuilder.Entity<User>()
            .HasOne(u => u.VendorProfile)
            .WithOne(vp => vp.User)
            .HasForeignKey<VendorProfile>(vp => vp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // VendorProfile - MenuItems (1:N)
        modelBuilder.Entity<MenuItem>()
            .HasOne(mi => mi.VendorProfile)
            .WithMany(vp => vp.MenuItems)
            .HasForeignKey(mi => mi.VendorProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // Category - MenuItems (1:N)
        modelBuilder.Entity<MenuItem>()
            .HasOne(mi => mi.Category)
            .WithMany(c => c.MenuItems)
            .HasForeignKey(mi => mi.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // User - CartItems (1:N)
        modelBuilder.Entity<CartItem>()
            .HasOne(ci => ci.User)
            .WithMany(u => u.CartItems)
            .HasForeignKey(ci => ci.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // MenuItem - CartItems (1:N)
        modelBuilder.Entity<CartItem>()
            .HasOne(ci => ci.MenuItem)
            .WithMany(mi => mi.CartItems)
            .HasForeignKey(ci => ci.MenuItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // User - Orders (1:N)
        modelBuilder.Entity<Order>()
            .HasOne(o => o.User)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Order - OrderItems (1:N)
        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.OrderItems)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // MenuItem - OrderItems (1:N)
        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.MenuItem)
            .WithMany(mi => mi.OrderItems)
            .HasForeignKey(oi => oi.MenuItemId)
            .OnDelete(DeleteBehavior.Restrict);

        // User - Reviews (1:N)
        modelBuilder.Entity<Review>()
            .HasOne(r => r.User)
            .WithMany(u => u.Reviews)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // MenuItem - Reviews (1:N)
        modelBuilder.Entity<Review>()
            .HasOne(r => r.MenuItem)
            .WithMany(mi => mi.Reviews)
            .HasForeignKey(r => r.MenuItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // User - PushSubscriptions (1:N)
        modelBuilder.Entity<PushSubscription>()
            .HasOne(ps => ps.User)
            .WithMany()
            .HasForeignKey(ps => ps.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraints
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<StudentProfile>()
            .HasIndex(sp => sp.StudentId)
            .IsUnique();

        modelBuilder.Entity<Order>()
            .HasIndex(o => o.OrderNumber)
            .IsUnique();

        // Seed default categories
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Meals", SortOrder = 1 },
            new Category { Id = 2, Name = "Snacks", SortOrder = 2 },
            new Category { Id = 3, Name = "Drinks", SortOrder = 3 },
            new Category { Id = 4, Name = "Desserts", SortOrder = 4 },
            new Category { Id = 5, Name = "Combos", SortOrder = 5 }
        );
    }
}