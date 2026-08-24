using System.ComponentModel.DataAnnotations;

namespace SureserveAPI.Models;

public class SystemSetting
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Value { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
