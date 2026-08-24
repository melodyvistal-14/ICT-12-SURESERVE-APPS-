using System.ComponentModel.DataAnnotations;

namespace SureserveAPI.Models;

public class VendorPasskey
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Description { get; set; } = string.Empty;

    public bool IsUsed { get; set; } = false;

    [MaxLength(50)]
    public string? UsedByUsername { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
