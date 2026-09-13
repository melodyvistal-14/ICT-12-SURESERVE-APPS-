using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SureserveAPI.Models;

public class TeacherProfile
{
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string TeacherId { get; set; } = string.Empty; // e.g. T-2026-00125

    [Required]
    [MaxLength(100)]
    public string Department { get; set; } = string.Empty; // e.g. Science, Mathematics

    [MaxLength(100)]
    public string Building { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Floor { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Room { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Section { get; set; } = string.Empty;

    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    public int Age { get; set; } = 0;

    [MaxLength(20)]
    public string Birthday { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Address { get; set; } = string.Empty;

    /// <summary>URL/path to the teacher's uploaded School ID photo (used for face-verification at login).</summary>
    [MaxLength(500)]
    public string TeacherIdPhotoUrl { get; set; } = string.Empty;

    // Navigation
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}