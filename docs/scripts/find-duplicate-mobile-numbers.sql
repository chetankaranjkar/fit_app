-- Duplicate mobile numbers report (Users.Phone = global mobile)
-- Run before/after migration 20260605120000_EnforceGlobalMobileNumberUniqueness

SELECT
    u.Phone AS MobileNumber,
    COUNT(*) AS UsersUsingIt,
    STRING_AGG(CAST(u.Id AS varchar(20)), ', ') WITHIN GROUP (ORDER BY u.Id) AS UserIds,
    STRING_AGG(LTRIM(RTRIM(u.FirstName + ' ' + u.LastName)), ' | ') WITHIN GROUP (ORDER BY u.Id) AS Names,
    STRING_AGG(CASE WHEN u.IsDeleted = 1 THEN 'deleted' ELSE CASE WHEN u.IsActive = 1 THEN 'active' ELSE 'inactive' END END, ', ') WITHIN GROUP (ORDER BY u.Id) AS Statuses
FROM Users u
WHERE u.Phone IS NOT NULL AND LTRIM(RTRIM(u.Phone)) <> ''
GROUP BY u.Phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, u.Phone;

-- Users missing a valid mobile after cleanup
SELECT Id, FirstName, LastName, Phone, IsActive, IsDeleted
FROM Users
WHERE IsDeleted = 0
  AND (Phone IS NULL OR Phone NOT LIKE '[6789][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
ORDER BY Id;
