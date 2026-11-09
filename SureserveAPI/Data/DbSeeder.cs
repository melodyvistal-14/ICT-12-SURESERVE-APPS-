using Microsoft.EntityFrameworkCore;
using SureserveAPI.Models;

namespace SureserveAPI.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext context)
    {
        context.Database.EnsureCreated();

        var isSqlite = context.Database.ProviderName?.Contains("Sqlite") ?? false;

        if (isSqlite)
        {
            var sqliteCommands = new[]
            {
                @"CREATE TABLE IF NOT EXISTS ""SystemSettings"" (
                    ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""Key"" TEXT NOT NULL,
                    ""Value"" TEXT NOT NULL,
                    ""UpdatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
                @"CREATE TABLE IF NOT EXISTS ""VendorPasskeys"" (
                    ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""Code"" TEXT NOT NULL,
                    ""Description"" TEXT NOT NULL DEFAULT '',
                    ""IsUsed"" INTEGER NOT NULL DEFAULT 0,
                    ""UsedByUsername"" TEXT,
                    ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
                @"CREATE TABLE IF NOT EXISTS ""PushSubscriptions"" (
                    ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""UserId"" INTEGER NOT NULL,
                    ""Endpoint"" TEXT NOT NULL,
                    ""P256dh"" TEXT NOT NULL,
                    ""Auth"" TEXT NOT NULL,
                    ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );",
                @"CREATE TABLE IF NOT EXISTS ""TeacherProfiles"" (
                    ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""UserId"" INTEGER NOT NULL UNIQUE,
                    ""TeacherId"" TEXT NOT NULL,
                    ""Department"" TEXT NOT NULL,
                    ""Building"" TEXT NOT NULL,
                    ""Floor"" TEXT NOT NULL,
                    ""Room"" TEXT NOT NULL,
                    ""Section"" TEXT NOT NULL,
                    ""FirstName"" TEXT NOT NULL,
                    ""LastName"" TEXT NOT NULL,
                    ""Age"" INTEGER NOT NULL,
                    ""Birthday"" TEXT NOT NULL,
                    ""Address"" TEXT NOT NULL,
                    ""TeacherIdPhotoUrl"" TEXT NOT NULL,
                    FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );",
                @"CREATE TABLE IF NOT EXISTS ""UserCancellationTrackings"" (
                    ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""UserId"" INTEGER NOT NULL UNIQUE,
                    ""CancellationCount"" INTEGER NOT NULL,
                    ""BlockExpiryDate"" TEXT,
                    ""LastResetDate"" TEXT NOT NULL,
                    FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );",
                @"ALTER TABLE ""Orders"" ADD COLUMN ""Building"" TEXT NOT NULL DEFAULT '';",
                @"ALTER TABLE ""Orders"" ADD COLUMN ""DeliveryFee"" decimal(10,2) NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""Orders"" ADD COLUMN ""DeliveryType"" TEXT NOT NULL DEFAULT '';",
                @"ALTER TABLE ""Orders"" ADD COLUMN ""Room"" TEXT NOT NULL DEFAULT '';",
                @"ALTER TABLE ""Orders"" ADD COLUMN ""Section"" TEXT NOT NULL DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""Section"" TEXT NOT NULL DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""FirstName"" TEXT DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""LastName"" TEXT DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""Age"" INTEGER DEFAULT 0;",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""Birthday"" TEXT DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""Strand"" TEXT DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""Address"" TEXT DEFAULT '';",
                @"ALTER TABLE ""StudentProfiles"" ADD COLUMN ""StudentIdPhotoUrl"" TEXT DEFAULT '';",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""FirstName"" TEXT DEFAULT '';",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""LastName"" TEXT DEFAULT '';",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""Age"" INTEGER DEFAULT 0;",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""Birthday"" TEXT DEFAULT '';",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""Address"" TEXT DEFAULT '';",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""Status"" TEXT DEFAULT 'Active';",
                @"ALTER TABLE ""VendorProfiles"" ADD COLUMN ""StallImageUrl"" TEXT DEFAULT '';",
                @"ALTER TABLE ""Users"" ADD COLUMN ""ProfileImageUrl"" TEXT DEFAULT '';"
            };

            foreach (var cmd in sqliteCommands)
            {
                try
                {
                    context.Database.ExecuteSqlRaw(cmd);
                }
                catch
                {
                    // Ignore column/table already exists errors
                }
            }
        }
        else
        {
            var alterCommands = new[]
            {
                "ALTER TABLE \"MenuItems\" ALTER COLUMN \"ImageUrl\" TYPE text;",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"FirstName\" varchar(50) DEFAULT '';",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"LastName\" varchar(50) DEFAULT '';",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Age\" integer DEFAULT 0;",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Birthday\" varchar(20) DEFAULT '';",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Strand\" varchar(100) DEFAULT '';",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Address\" varchar(255) DEFAULT '';",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"Section\" varchar(50) DEFAULT '';",
                "ALTER TABLE \"StudentProfiles\" ADD COLUMN IF NOT EXISTS \"StudentIdPhotoUrl\" text DEFAULT '';",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"FirstName\" varchar(50) DEFAULT '';",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"LastName\" varchar(50) DEFAULT '';",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Age\" integer DEFAULT 0;",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Birthday\" varchar(20) DEFAULT '';",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Address\" varchar(255) DEFAULT '';",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"Status\" varchar(50) DEFAULT 'Active';",
                "ALTER TABLE \"VendorProfiles\" ADD COLUMN IF NOT EXISTS \"StallImageUrl\" varchar(255) DEFAULT '';",
                "ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"ProfileImageUrl\" varchar(255) DEFAULT '';",
                "ALTER TABLE \"Orders\" ADD COLUMN IF NOT EXISTS \"Building\" varchar(100) DEFAULT '';",
                "ALTER TABLE \"Orders\" ADD COLUMN IF NOT EXISTS \"DeliveryFee\" numeric(10,2) DEFAULT 0;",
                "ALTER TABLE \"Orders\" ADD COLUMN IF NOT EXISTS \"DeliveryType\" varchar(20) DEFAULT '';",
                "ALTER TABLE \"Orders\" ADD COLUMN IF NOT EXISTS \"Room\" varchar(50) DEFAULT '';",
                "ALTER TABLE \"Orders\" ADD COLUMN IF NOT EXISTS \"Section\" varchar(50) DEFAULT '';"
            };

            foreach (var cmd in alterCommands)
            {
                try
                {
                    context.Database.ExecuteSqlRaw(cmd);
                }
                catch
                {
                    // Ignore if it fails
                }
            }

            try
            {
                context.Database.ExecuteSqlRaw(@"
                    CREATE TABLE IF NOT EXISTS ""SystemSettings"" (
                        ""Id"" SERIAL PRIMARY KEY,
                        ""Key"" varchar(50) NOT NULL,
                        ""Value"" varchar(255) NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS ""VendorPasskeys"" (
                        ""Id"" SERIAL PRIMARY KEY,
                        ""Code"" varchar(50) NOT NULL,
                        ""Description"" varchar(100) NOT NULL DEFAULT '',
                        ""IsUsed"" boolean NOT NULL DEFAULT FALSE,
                        ""UsedByUsername"" varchar(50),
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS ""PushSubscriptions"" (
                        ""Id"" SERIAL PRIMARY KEY,
                        ""UserId"" integer NOT NULL,
                        ""Endpoint"" text NOT NULL,
                        ""P256dh"" varchar(255) NOT NULL,
                        ""Auth"" varchar(255) NOT NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT ""FK_PushSubscriptions_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                    );
                    CREATE TABLE IF NOT EXISTS ""TeacherProfiles"" (
                        ""Id"" SERIAL PRIMARY KEY,
                        ""UserId"" integer NOT NULL UNIQUE,
                        ""TeacherId"" varchar(20) NOT NULL,
                        ""Department"" varchar(100) NOT NULL,
                        ""Building"" varchar(100) NOT NULL,
                        ""Floor"" varchar(50) NOT NULL,
                        ""Room"" varchar(50) NOT NULL,
                        ""Section"" varchar(50) NOT NULL,
                        ""FirstName"" varchar(50) NOT NULL,
                        ""LastName"" varchar(50) NOT NULL,
                        ""Age"" integer NOT NULL,
                        ""Birthday"" varchar(20) NOT NULL,
                        ""Address"" varchar(255) NOT NULL,
                        ""TeacherIdPhotoUrl"" varchar(500) NOT NULL DEFAULT '',
                        CONSTRAINT ""FK_TeacherProfiles_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                    );
                    CREATE TABLE IF NOT EXISTS ""UserCancellationTrackings"" (
                        ""Id"" SERIAL PRIMARY KEY,
                        ""UserId"" integer NOT NULL UNIQUE,
                        ""CancellationCount"" integer NOT NULL,
                        ""BlockExpiryDate"" timestamp with time zone,
                        ""LastResetDate"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT ""FK_UserCancellationTrackings_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                    );
                ");
            }
            catch
            {
                // Ignore if already existing
            }
        }

        // 1. Admin
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

        // 2. Settings & Vendor Passkeys
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
                new VendorPasskey { Code = "SURESERVE-PASS-9081", Description = "For Stall 1 (Tia Mel's Canteen)", IsUsed = true, UsedByUsername = "demovendor" },
                new VendorPasskey { Code = "SURESERVE-PASS-4412", Description = "For Stall 2 (Snack Bar)", IsUsed = false },
                new VendorPasskey { Code = "SURESERVE-PASS-7823", Description = "For Stall 3 (Beverage Corner)", IsUsed = false }
            );
            context.SaveChanges();
        }

        // 3. Demo Vendor Account
        var vendorUser = context.Users.Include(u => u.VendorProfile).FirstOrDefault(u => u.Username == "demovendor" || u.Role == "Vendor");
        if (vendorUser == null)
        {
            vendorUser = new User
            {
                Username = "demovendor",
                Password = "vendor123",
                FullName = "Tia Mel Demo",
                Role = "Vendor",
                Email = "vendor@sureserve.edu",
                ContactNumber = "0917-123-4567"
            };
            context.Users.Add(vendorUser);
            context.SaveChanges();

            var vendorProfile = new VendorProfile
            {
                UserId = vendorUser.Id,
                ShopName = "Tia Mel's Canteen",
                Description = "Fresh & Delicious School Meals",
                IsActive = true
            };
            context.VendorProfiles.Add(vendorProfile);
            context.SaveChanges();
        }
        else if (vendorUser.VendorProfile == null)
        {
            var vendorProfile = new VendorProfile
            {
                UserId = vendorUser.Id,
                ShopName = "Tia Mel's Canteen",
                Description = "Fresh & Delicious School Meals",
                IsActive = true
            };
            context.VendorProfiles.Add(vendorProfile);
            context.SaveChanges();
        }

        // Ensure Categories exist
        if (!context.Categories.Any())
        {
            context.Categories.AddRange(
                new Category { Name = "Meals" },
                new Category { Name = "Snacks" },
                new Category { Name = "Drinks" },
                new Category { Name = "Desserts" }
            );
            context.SaveChanges();
        }

        // Ensure Menu items exist for vendor
        var vendorProf = context.VendorProfiles.FirstOrDefault(vp => vp.UserId == vendorUser.Id);
        if (vendorProf != null && !context.MenuItems.Any(m => m.VendorProfileId == vendorProf.Id))
        {
            var mealsCategory = context.Categories.FirstOrDefault(c => c.Name == "Meals")?.Id ?? 1;
            var snacksCategory = context.Categories.FirstOrDefault(c => c.Name == "Snacks")?.Id ?? 2;
            var drinksCategory = context.Categories.FirstOrDefault(c => c.Name == "Drinks")?.Id ?? 3;

            var items = new List<MenuItem>
            {
                new MenuItem
                {
                    VendorProfileId = vendorProf.Id,
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
                    VendorProfileId = vendorProf.Id,
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
                    VendorProfileId = vendorProf.Id,
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
                    VendorProfileId = vendorProf.Id,
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

        // 4. Demo Student Account (demostudent / student123)
        var studentUser = context.Users.Include(u => u.StudentProfile).FirstOrDefault(u => u.Username == "demostudent");
        if (studentUser == null)
        {
            studentUser = new User
            {
                Username = "demostudent",
                Password = "student123",
                FullName = "Demo Student",
                Role = "Student",
                Email = "demostudent@sureserve.edu",
                ContactNumber = "0912-345-6789"
            };
            context.Users.Add(studentUser);
            context.SaveChanges();

            var studentProfile = new StudentProfile
            {
                UserId = studentUser.Id,
                StudentId = "2026-DEMO",
                GradeSection = "Grade 12 - STEM A",
                Building = "Building A",
                Floor = "2nd Floor",
                Room = "Room 201",
                Section = "STEM A",
                FirstName = "Demo",
                LastName = "Student",
                Age = 18,
                Birthday = "2008-01-01",
                Strand = "STEM",
                Address = "Campus Grounds",
                StudentIdPhotoUrl = "" // Demo: ID verification bypassed
            };
            context.StudentProfiles.Add(studentProfile);
            context.SaveChanges();
        }

        // Also ensure legacy/simple 'student' user has a profile if it exists
        var legacyStudent = context.Users.Include(u => u.StudentProfile).FirstOrDefault(u => u.Username == "student");
        if (legacyStudent != null && legacyStudent.StudentProfile == null)
        {
            legacyStudent.StudentProfile = new StudentProfile
            {
                UserId = legacyStudent.Id,
                StudentId = "2026-00125",
                GradeSection = "Grade 12 - ABM A",
                Building = "Building B",
                Floor = "2nd Floor",
                Room = "Room 203",
                Section = "ABM A",
                FirstName = "Princess",
                LastName = "Sabino",
                Age = 18,
                Birthday = "2008-05-15",
                Strand = "ABM",
                Address = "Campus Grounds",
                StudentIdPhotoUrl = ""
            };
            context.SaveChanges();
        }

        // 5. Demo Teacher Account (demoteacher / teacher123)
        var teacherUser = context.Users.Include(u => u.TeacherProfile).FirstOrDefault(u => u.Username == "demoteacher");
        if (teacherUser == null)
        {
            teacherUser = new User
            {
                Username = "demoteacher",
                Password = "teacher123",
                FullName = "Demo Teacher",
                Role = "Teacher",
                Email = "demoteacher@sureserve.edu",
                ContactNumber = "0918-765-4321"
            };
            context.Users.Add(teacherUser);
            context.SaveChanges();

            var teacherProfile = new TeacherProfile
            {
                UserId = teacherUser.Id,
                TeacherId = "T-DEMO",
                Department = "Science Department",
                Building = "Faculty Building",
                Floor = "1st Floor",
                Room = "Faculty Room 101",
                Section = "Faculty",
                FirstName = "Demo",
                LastName = "Teacher",
                Age = 35,
                Birthday = "1991-01-01",
                Address = "Faculty Housing",
                TeacherIdPhotoUrl = "" // Demo: ID verification bypassed
            };
            context.TeacherProfiles.Add(teacherProfile);
            context.SaveChanges();
        }

        // Also ensure simple 'teacher' alias account exists for convenience
        var simpleTeacher = context.Users.Include(u => u.TeacherProfile).FirstOrDefault(u => u.Username == "teacher");
        if (simpleTeacher == null)
        {
            simpleTeacher = new User
            {
                Username = "teacher",
                Password = "teacher123",
                FullName = "Maria Santos (Teacher)",
                Role = "Teacher",
                Email = "teacher@sureserve.edu",
                ContactNumber = "0918-765-4322"
            };
            context.Users.Add(simpleTeacher);
            context.SaveChanges();

            var teacherProfile = new TeacherProfile
            {
                UserId = simpleTeacher.Id,
                TeacherId = "EN-6452385",
                Department = "Mathematics Department",
                Building = "Faculty Building",
                Floor = "2nd Floor",
                Room = "Faculty Room 205",
                Section = "Faculty",
                FirstName = "Maria",
                LastName = "Santos",
                Age = 32,
                Birthday = "1994-03-20",
                Address = "Faculty Housing",
                TeacherIdPhotoUrl = ""
            };
            context.TeacherProfiles.Add(teacherProfile);
            context.SaveChanges();
        }
    }
}
