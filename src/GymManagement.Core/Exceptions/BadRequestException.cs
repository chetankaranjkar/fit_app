namespace GymManagement.Core.Exceptions;

public sealed class BadRequestException : DomainException
{
    public BadRequestException(string message) : base(message)
    {
    }
}
