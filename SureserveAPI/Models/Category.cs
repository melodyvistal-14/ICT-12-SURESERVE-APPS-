using System.ComponentModel.DataAnnotations;

namespace SureserveAPI.Models;

public class Category
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty; // Meals, Snacks, Drinks, Desserts, Combos

    [MaxLength(255)]
    public string IconUrl { get; set; } = string.Empty;

    public int SortOrder { get; set; } = 0;

    // Navigation
    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
}
