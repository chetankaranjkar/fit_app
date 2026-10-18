SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @branchId int;
DECLARE @branchName nvarchar(200);

SELECT TOP 1 @branchId = Id, @branchName = BranchName
FROM Branches
WHERE IsActive = 1
ORDER BY Id;

IF @branchId IS NULL
BEGIN
    RAISERROR('No active branch exists.', 16, 1);
    RETURN;
END

UPDATE u
SET HomeBranchId = @branchId
FROM Users u
INNER JOIN UserRoles ur ON ur.UserId = u.Id AND ur.IsDeleted = 0
INNER JOIN Roles r ON r.Id = ur.RoleId AND r.IsDeleted = 0 AND r.Name = N'MEMBER'
WHERE u.IsDeleted = 0
  AND u.HomeBranchId IS NULL;

SELECT @branchId AS AssignedBranchId, @branchName AS AssignedBranchName, @@ROWCOUNT AS MembersAssigned;

SELECT
    SUM(CASE WHEN u.HomeBranchId IS NULL THEN 1 ELSE 0 END) AS MembersStillUnassigned,
    SUM(CASE WHEN u.HomeBranchId IS NOT NULL THEN 1 ELSE 0 END) AS MembersWithHomeBranch
FROM Users u
INNER JOIN UserRoles ur ON ur.UserId = u.Id AND ur.IsDeleted = 0
INNER JOIN Roles r ON r.Id = ur.RoleId AND r.IsDeleted = 0 AND r.Name = N'MEMBER'
WHERE u.IsDeleted = 0;
