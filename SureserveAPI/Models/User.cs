using System.ComponentModel.DataAnnotations;

namespace SureserveAPI.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string ContactNumber { get; set; } = string.Empty;

    [MaxLength(255)]
    public string ProfileImageUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "Student"; // Student, Vendor, Admin

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public StudentProfile? StudentProfile { get; set; }
    public VendorProfile? VendorProfile { get; set; }
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}