-- Run this script in SSMS against [GymManagementDb] to insert default membership plans
-- if the table is empty (e.g. app seed didn't run or failed).

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM [dbo].[membership_plans] WHERE [IsDeleted] = 0)
BEGIN
    INSERT INTO [dbo].[membership_plans] ([PlanName], [DurationDays], [Price], [Description], [CreatedDate], [UpdatedDate], [IsDeleted])
    VALUES
        (N'Monthly', 30, 49.99, N'1 month access to gym facilities', GETUTCDATE(), NULL, 0),
        (N'Quarterly', 90, 129.99, N'3 months access - save 13%', GETUTCDATE(), NULL, 0),
        (N'Half Yearly', 180, 229.99, N'6 months access - save 23%', GETUTCDATE(), NULL, 0),
        (N'Yearly', 365, 399.99, N'Full year access - best value', GETUTCDATE(), NULL, 0);
    PRINT 'Inserted 4 default membership plans.';
END
ELSE
    PRINT 'membership_plans already has data; no insert.';
