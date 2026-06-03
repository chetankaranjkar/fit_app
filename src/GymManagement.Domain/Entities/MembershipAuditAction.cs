namespace GymManagement.Domain.Entities
{
    public enum MembershipAuditAction
    {
        Created,
        Updated,
        Renewed,
        CancelRequested,
        CancelApproved,
        VoidRequested,
        VoidApproved,
        VoidRejected,
        FeeChanged,
        PlanChanged,
        DateChanged,
        StatusChanged,
        TransferRequested,
        TransferApproved,
    }
}
