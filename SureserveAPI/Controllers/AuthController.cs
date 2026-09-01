using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SureserveAPI.Data;
using SureserveAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    public AuthController(AppDbContext context, IConfiguration configuration, IWebHostEnvironment env)
    {
        _context = context;
        _configuration = configuration;
        _env = env;
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/login
    // ─────────────────────────────────────────────
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username/Passkey and Password are required." });
        }

        var input = request.Username.Trim();

        // 1. Check if input matches a redeemed Vendor Passkey Code first
        var passkeyRecord = _context.VendorPasskeys
            .FirstOrDefault(p => p.Code == input && p.IsUsed && !string.IsNullOrEmpty(p.UsedByUsername));

        string targetUsername = passkeyRecord != null ? passkeyRecord.UsedByUsername! : input;

        var user = _context.Users
            .Include(u => u.VendorProfile)
            .Include(u => u.StudentProfile)
            .FirstOrDefault(u => u.Username == targetUsername && u.Password == request.Password);

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid username/passkey or password." });
        }

        // 2. Enforce portal security role restrictions
        if (!string.IsNullOrWhiteSpace(request.PortalRole) && user.Role != "Admin")
        {
            if (string.Equals(request.PortalRole, "Student", StringComparison.OrdinalIgnoreCase) && user.Role == "Vendor")
            {
                return BadRequest(new { message = "Access Denied: Canteen Vendors must log in via the Vendor Portal." });
            }

            if (string.Equals(request.PortalRole, "Vendor", StringComparison.OrdinalIgnoreCase) && user.Role == "Student")
            {
                return BadRequest(new { message = "Access Denied: Students are NOT authorized to log into the Canteen Vendor Portal." });
            }
        }

        // 3. For students: return requiresIdVerification = true so the frontend triggers Step 2
        if (user.Role == "Student")
        {
            var hasIdPhoto = !string.IsNullOrWhiteSpace(user.StudentProfile?.StudentIdPhotoUrl);
            return Ok(new
            {
                requiresIdVerification = hasIdPhoto,
                // Pass a short-lived pre-auth token (same JWT) so Step 2 can call verify-id-photo
                preAuthToken = GenerateJwtToken(user),
                user = new { user.Id, user.Username, user.FullName, user.Role }
            });
        }

        var token = GenerateJwtToken(user);
        return Ok(new { requiresIdVerification = false, token, user = new { user.Id, user.Username, user.FullName, user.Role } });
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/verify-id-photo
    // Returns the stored StudentIdPhotoUrl so the frontend face-api.js can compare
    // ─────────────────────────────────────────────
    [HttpPost("verify-id-photo")]
    public IActionResult VerifyIdPhoto([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Credentials are required." });
        }

        var user = _context.Users
            .Include(u => u.StudentProfile)
            .FirstOrDefault(u => u.Username == request.Username.Trim() && u.Password == request.Password);

        if (user == null || user.Role != "Student")
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var photoUrl = user.StudentProfile?.StudentIdPhotoUrl ?? string.Empty;
        if (string.IsNullOrWhiteSpace(photoUrl))
        {
            // No ID photo stored — skip verification, return full token
            var skipToken = GenerateJwtToken(user);
            return Ok(new { requiresIdVerification = false, token = skipToken, studentIdPhotoUrl = (string?)null });
        }

        return Ok(new { requiresIdVerification = true, studentIdPhotoUrl = photoUrl });
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/complete-login
    // Called after face verification succeeds; returns the final JWT
    // ─────────────────────────────────────────────
    [HttpPost("complete-login")]
    public IActionResult CompleteLogin([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Credentials are required." });
        }

        var user = _context.Users
            .FirstOrDefault(u => u.Username == request.Username.Trim() && u.Password == request.Password);

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var token = GenerateJwtToken(user);
        return Ok(new { token, user = new { user.Id, user.Username, user.FullName, user.Role } });
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/upload-image
    // Accepts multipart/form-data; saves image to wwwroot/uploads/; returns URL
    // ─────────────────────────────────────────────
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPG, PNG, or WEBP images are allowed." });

        // Max 5 MB
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Image must be smaller than 5 MB." });

        var uploadsPath = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");
        if (!Directory.Exists(uploadsPath))
            Directory.CreateDirectory(uploadsPath);

        var ext = Path.GetExtension(file.FileName).ToLower();
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsPath, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/uploads/{fileName}";

        return Ok(new { url });
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/register
    // ─────────────────────────────────────────────
    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        if (_context.Users.Any(u => u.Username == request.Username))
        {
            return BadRequest(new { message = "Username already exists" });
        }

        var role = string.Equals(request.Role, "Vendor", StringComparison.OrdinalIgnoreCase) ? "Vendor" : "Student";

        // For students: enforce one account per Student ID
        if (role == "Student" && !string.IsNullOrWhiteSpace(request.StudentId))
        {
            var studentIdAlreadyUsed = _context.StudentProfiles
                .Any(sp => sp.StudentId == request.StudentId.Trim());
            if (studentIdAlreadyUsed)
            {
                return BadRequest(new { message = "A student account with this Student ID already exists. Each student can only have one account." });
            }
        }

        var fullName = !string.IsNullOrWhiteSpace(request.FullName)
            ? request.FullName
            : $"{request.FirstName} {request.LastName}".Trim();

        if (string.IsNullOrWhiteSpace(fullName)) fullName = request.Username;

        var user = new User
        {
            Username = request.Username,
            Password = request.Password,
            FullName = fullName,
            Role = role,
            ProfileImageUrl = request.ProfileImageUrl ?? string.Empty
        };

        _context.Users.Add(user);
        _context.SaveChanges();

        if (role == "Vendor")
        {
            var vendorCode = request.VendorCode?.Trim();
            if (string.IsNullOrWhiteSpace(vendorCode))
            {
                return BadRequest(new { message = "Vendor Verification Passkey is required." });
            }

            // Check individual passkeys table first
            var passkeyRecord = _context.VendorPasskeys.FirstOrDefault(p => p.Code == vendorCode);
            var isPasskeyValid = false;

            if (passkeyRecord != null)
            {
                if (passkeyRecord.IsUsed)
                {
                    return BadRequest(new { message = "This Vendor Passkey has already been used by another vendor." });
                }
                isPasskeyValid = true;
                passkeyRecord.IsUsed = true;
                passkeyRecord.UsedByUsername = request.Username;
            }
            else
            {
                // Fallback check against default SystemSetting passkey
                var dbPasskey = _context.SystemSettings.FirstOrDefault(s => s.Key == "VendorPasskey")?.Value;
                var expectedPasskey = !string.IsNullOrWhiteSpace(dbPasskey)
                    ? dbPasskey
                    : (_configuration["VendorSecurity:Passkey"] ?? "SURESERVE-VENDOR-2026");

                if (string.Equals(vendorCode, expectedPasskey, StringComparison.OrdinalIgnoreCase))
                {
                    isPasskeyValid = true;
                }
            }

            if (!isPasskeyValid)
            {
                return BadRequest(new { message = "Invalid Vendor Verification Passkey. Please ask the School Admin for your passkey." });
            }

            var vendorProfile = new VendorProfile
            {
                UserId = user.Id,
                ShopName = string.IsNullOrWhiteSpace(request.ShopName) ? $"{fullName}'s Canteen" : request.ShopName,
                Description = "School Canteen Vendor",
                IsActive = true,
                FirstName = request.FirstName ?? string.Empty,
                LastName = request.LastName ?? string.Empty,
                Age = request.Age ?? 0,
                Birthday = request.Birthday ?? string.Empty,
                Address = request.Address ?? string.Empty,
                StallImageUrl = request.StallImageUrl ?? string.Empty
            };
            _context.VendorProfiles.Add(vendorProfile);
        }
        else
        {
            var studentProfile = new StudentProfile
            {
                UserId = user.Id,
                FirstName = request.FirstName ?? string.Empty,
                LastName = request.LastName ?? string.Empty,
                StudentId = string.IsNullOrWhiteSpace(request.StudentId) ? $"STU-{new Random().Next(10000, 99999)}" : request.StudentId,
                GradeSection = string.IsNullOrWhiteSpace(request.GradeSection) ? "Grade 10" : request.GradeSection,
                Strand = request.Strand ?? string.Empty,
                Age = request.Age ?? 0,
                Birthday = request.Birthday ?? string.Empty,
                Address = request.Address ?? string.Empty,
                StudentIdPhotoUrl = request.StudentIdPhotoUrl ?? string.Empty
            };
            _context.StudentProfiles.Add(studentProfile);
        }

        _context.SaveChanges();

        var token = GenerateJwtToken(user);
        return Ok(new { token, user = new { user.Id, user.Username, user.FullName, user.Role } });
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpirationInMinutes"]!)),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(secretKey), SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? PortalRole { get; set; }
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = "Student";
    public string? ShopName { get; set; }
    public string? VendorCode { get; set; }

    // Student Registration Fields
    public string? StudentId { get; set; }
    public string? GradeSection { get; set; }
    public string? Strand { get; set; }
    public int? Age { get; set; }
    public string? Birthday { get; set; }
    public string? Address { get; set; }

    /// <summary>URL of the uploaded Profile Picture (for both students and vendors).</summary>
    public string? ProfileImageUrl { get; set; }

    /// <summary>URL of the uploaded School ID photo (from /auth/upload-image).</summary>
    public string? StudentIdPhotoUrl { get; set; }

    /// <summary>URL of the uploaded Full Picture of the canteen stall (vendors only).</summary>
    public string? StallImageUrl { get; set; }
}