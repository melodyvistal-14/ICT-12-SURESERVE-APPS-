using Microsoft.EntityFrameworkCore;
using SureserveAPI.Models;

namespace SureserveAPI.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext context)
    {
        context.Database.EnsureCreated();

        try
        {
            context.Database.ExecuteSqlRaw("ALTER TABLE \"MenuItems\" ALTER COLUMN \"ImageUrl\" TYPE text;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"FirstName\" varchar(50) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"LastName\" varchar(50) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Age\" integer DEFAULT 0;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Birthday\" varchar(20) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Strand\" varchar(100) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Address\" varchar(255) DEFAULT '';");

            context.Database.ExecuteSqlRaw("ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"FirstName\" varchar(50) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"LastName\" varchar(50) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Age\" integer DEFAULT 0;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Birthday\" varchar(20) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Address\" varchar(255) DEFAULT '';");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Status\" varchar(50) DEFAULT 'Active';");


            context.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""SystemSettings"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Key"" varchar(50) NOT NULL,
                    ""Value"" varchar(255) NOT NULL,
                    ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            ");

            context.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""VendorPasskeys"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Code"" varchar(50) NOT NULL,
                    ""Description"" varchar(100) NOT NULL DEFAULT '',
                    ""IsUsed"" boolean NOT NULL DEFAULT FALSE,
                    ""UsedByUsername"" varchar(50),
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            ");

            context.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS ""PushSubscriptions"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""UserId"" integer NOT NULL,
                    ""Endpoint"" text NOT NULL,
                    ""P256dh"" varchar(255) NOT NULL,
                    ""Auth"" varchar(255) NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT ""FK_PushSubscriptions_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );
            ");
        }
        catch
        {
            // Ignore if already existing
        }

        if (!context.Users.Any(u => u.Role == "Admin"))
        {
            var adminUser = new User
            {
                Username = "admin",
                Password = "admin123",
                FullName = "School Canteen Administrator",
                Role = "Admin",
                Email = "admin@sureserve.edu",
                ContactNumber = "0900-000-0000"
            };
            context.Users.Add(adminUser);
            context.SaveChanges();
        }

        if (!context.SystemSettings.Any(s => s.Key == "VendorPasskey"))
        {
            context.SystemSettings.Add(new SystemSetting
            {
                Key = "VendorPasskey",
                Value = "SURESERVE-VENDOR-2026",
                UpdatedAt = DateTime.UtcNow
            });
            context.SaveChanges();
        }

        if (!context.VendorPasskeys.Any())
        {
            context.VendorPasskeys.AddRange(
                new VendorPasskey { Code = "SURESERVE-PASS-9081", Description = "For Stall 1 (Tia Mel's Canteen)", IsUsed = true, UsedByUsername = "vendor" },
                new VendorPasskey { Code = "SURESERVE-PASS-4412", Description = "For Stall 2 (Snack Bar)", IsUsed = false },
                new VendorPasskey { Code = "SURESERVE-PASS-7823", Description = "For Stall 3 (Beverage Corner)", IsUsed = false }
            );
            context.SaveChanges();
        }

        if (!context.Users.Any(u => u.Role == "Vendor" || u.Role == "Student"))
        {
            // Create Vendor Account
            var vendorUser = new User
            {
                Username = "vendor",
                Password = "vendor123",
                FullName = "Tia Mel",
                Role = "Vendor",
                Email = "vendor@sureserve.edu",
                ContactNumber = "0917-123-4567"
            };
            context.Users.Add(vendorUser);

            // Create Student Account
            var studentUser = new User
            {
                Username = "student",
                Password = "student123",
                FullName = "Princess Sabino",
                Role = "Student",
                Email = "princess@sureserve.edu",
                ContactNumber = "0999-888-7766"
            };
            context.Users.Add(studentUser);
            context.SaveChanges();

            // Create Vendor Profile
            var vendorProfile = new VendorProfile
            {
                UserId = vendorUser.Id,
                ShopName = "Tia Mel's Canteen",
                Description = "Fresh & Delicious School Meals",
                IsActive = true
            };
            context.VendorProfiles.Add(vendorProfile);

            // Create Student Profile
            var studentProfile = new StudentProfile
            {
                UserId = studentUser.Id,
                StudentId = "2026-00125",
                GradeSection = "Grade 12 - ABM A",
                Building = "Building B",
                Floor = "2nd Floor",
                Room = "Room 203"
            };
            context.StudentProfiles.Add(studentProfile);
            context.SaveChanges();

            // Seed Menu Items for the Vendor
            var mealsCategory = context.Categories.FirstOrDefault(c => c.Name == "Meals")?.Id ?? 1;
            var snacksCategory = context.Categories.FirstOrDefault(c => c.Name == "Snacks")?.Id ?? 2;
            var drinksCategory = context.Categories.FirstOrDefault(c => c.Name == "Drinks")?.Id ?? 3;

            var items = new List<MenuItem>
            {
                new MenuItem
                {
                    VendorProfileId = vendorProfile.Id,
                    CategoryId = mealsCategory,
                    Name = "Cheesy Chicken Burger",
                    Description = "Juicy chicken fillet with cheese, lettuce, special sauce and bun.",
                    Price = 85.00m,
                    ImageUrl = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
                    IsAvailable = true,
                    IsSpecial = true,
                    Stock = 50
                },
                new MenuItem
                {
                    VendorProfileId = vendorProfile.Id,
                    CategoryId = mealsCategory,
                    Name = "Chicken Teriyaki",
                    Description = "Grilled chicken teriyaki served with warm steamed rice.",
                    Price = 75.00m,
                    ImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500",
                    IsAvailable = true,
                    IsSpecial = false,
                    Stock = 30
                },
                new MenuItem
                {
                    VendorProfileId = vendorProfile.Id,
                    CategoryId = snacksCategory,
                    Name = "Nachos with Cheese",
                    Description = "Crispy tortilla chips topped with warm cheese sauce and jalapeños.",
                    Price = 60.00m,
                    ImageUrl = "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500",
                    IsAvailable = true,
                    IsSpecial = false,
                    Stock = 40
                },
                new MenuItem
                {
                    VendorProfileId = vendorProfile.Id,
                    CategoryId = drinksCategory,
                    Name = "Iced Tea",
                    Description = "Refreshing ice-cold lemon iced tea.",
                    Price = 35.00m,
                    ImageUrl = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500",
                    IsAvailable = true,
                    IsSpecial = false,
                    Stock = 100
                }
            };

            context.MenuItems.AddRange(items);
            context.SaveChanges();
        }
    }
}
