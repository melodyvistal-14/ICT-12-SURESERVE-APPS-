using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SureserveAPI.Data;
using SureserveAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// Database - Railway PostgreSQL or Local SQLite fallback
var connectionString = "";
var usePostgres = false;

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var pgHost = Environment.GetEnvironmentVariable("PGHOST");

if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    usePostgres = true;
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var npgsqlBuilder = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = userInfo[0],
        Password = userInfo.Length > 1 ? userInfo[1] : "",
        SslMode = Npgsql.SslMode.Require
    };
    connectionString = npgsqlBuilder.ConnectionString;
}
else if (!string.IsNullOrWhiteSpace(pgHost))
{
    usePostgres = true;
    connectionString = $"Host={pgHost};" +
                     $"Port={Environment.GetEnvironmentVariable("PGPORT")};" +
                     $"Database={Environment.GetEnvironmentVariable("PGDATABASE")};" +
                     $"Username={Environment.GetEnvironmentVariable("PGUSER")};" +
                     $"Password={Environment.GetEnvironmentVariable("PGPASSWORD")};";
}
else
{
    // Fallback to local SQLite when running locally
    connectionString = "Data Source=app.db";
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usePostgres)
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

builder.Services.AddSingleton<PushNotificationService>();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!))
    };
});

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

// Serve uploaded student ID photos from wwwroot/uploads/
var uploadsDir = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
if (!Directory.Exists(uploadsDir))
    Directory.CreateDirectory(uploadsDir);
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Seed database with default accounts & menu items
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var dbConn = dbContext.Database.GetDbConnection();
    if (dbConn.GetType().Name == "NpgsqlConnection")
    {
        dbConn.Open();
        using (var cmd = dbConn.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Users'";
            var usersExists = Convert.ToInt64(cmd.ExecuteScalar()) > 0;

            cmd.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '__EFMigrationsHistory'";
            var historyExists = Convert.ToInt64(cmd.ExecuteScalar()) > 0;

            if (usersExists)
            {
                if (!historyExists)
                {
                    cmd.CommandText = "CREATE TABLE \"__EFMigrationsHistory\" (\"MigrationId\" character varying(150) NOT NULL, \"ProductVersion\" character varying(32) NOT NULL, CONSTRAINT \"PK___EFMigrationsHistory\" PRIMARY KEY (\"MigrationId\"));";
                    cmd.ExecuteNonQuery();
                }

                cmd.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsHistory\"";
                var count = Convert.ToInt64(cmd.ExecuteScalar());

                if (count == 0)
                {
                    var oldMigrations = new[] {
                        "20260803103229_InitialCreate",
                        "20260803110229_AddSureServeModels",
                        "20260803110747_RemoveDeliveryAddPickup",
                        "20260826180325_AddPushSubscriptions",
                        "20260901215345_AddStudentIdPhotoUrl",
                        "20260901230213_AddStallImageUrl"
                    };
                    foreach (var m in oldMigrations)
                    {
                        cmd.CommandText = $"INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('{m}', '8.0.0') ON CONFLICT DO NOTHING;";
                        cmd.ExecuteNonQuery();
                    }
                }
            }
        }
        dbConn.Close();
    }

    dbContext.Database.Migrate(); // Ensure database schema is up-to-date
    DbSeeder.Seed(dbContext);
}

app.MapControllers();

app.Run();