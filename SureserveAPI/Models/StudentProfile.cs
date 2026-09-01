using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SureserveAPI.Models;

public class StudentProfile
{
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string StudentId { get; set; } = string.Empty; // e.g. 2026-00125

    [Required]
    [MaxLength(50)]
    public string GradeSection { get; set; } = string.Empty; // e.g. Grade 12 - ABM A

    [MaxLength(100)]
    public string Building { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Floor { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Room { get; set; } = string.Empty;

    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    public int Age { get; set; } = 0;

    [MaxLength(20)]
    public string Birthday { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Strand { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Address { get; set; } = string.Empty;

    /// <summary>URL/path to the student's uploaded School ID photo (used for face-verification at login).</summary>
    [MaxLength(500)]
    public string StudentIdPhotoUrl { get; set; } = string.Empty;

    // Navigation
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}
