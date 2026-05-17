-- Run on VPS if Organizations table is empty (SSMS / sqlcmd against GymManagementDb).
IF NOT EXISTS (SELECT 1 FROM dbo.Organizations)
BEGIN
    INSERT INTO dbo.Organizations (Name, OrganizationType, IsActive, CreatedDate)
    VALUES (N'PulseFit Gym', N'Gym', 1, SYSUTCDATETIME());
END
GO
