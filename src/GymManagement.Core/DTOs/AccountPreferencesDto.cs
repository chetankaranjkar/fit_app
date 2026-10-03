using System.ComponentModel.DataAnnotations;

namespace GymManagement.Core.DTOs;

public sealed class AccountPreferencesDto
{
    [Required]
    [RegularExpression("^(light|dark)$", ErrorMessage = "Theme must be light or dark.")]
    public string Theme { get; set; } = "dark";
}

public sealed class UpdateAccountPreferencesDto
{
    [Required]
    [RegularExpression("^(light|dark)$", ErrorMessage = "Theme must be light or dark.")]
    public string Theme { get; set; } = string.Empty;
}
