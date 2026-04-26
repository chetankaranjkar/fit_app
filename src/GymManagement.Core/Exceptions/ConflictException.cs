namespace GymManagement.Core.Exceptions;

public sealed class ConflictException : DomainException
{
    public ConflictException(string message) : base(message)
    {
    }
}
