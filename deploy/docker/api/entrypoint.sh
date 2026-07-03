#!/bin/sh
set -eu

UPLOADS="/app/wwwroot/uploads"

# Ensure upload tree exists (Docker volume mount may hide image dirs or be root-owned).
for dir in \
  "${UPLOADS}/profiles/users" \
  "${UPLOADS}/profiles/trainers" \
  "${UPLOADS}/body/users" \
  "${UPLOADS}/body-parts" \
  "${UPLOADS}/.data-protection-keys"; do
  mkdir -p "${dir}"
done

# Legacy path (pre-304d9fc); harmless once API uses uploads/.data-protection-keys
mkdir -p /app/DataProtection-Keys

# Volume mounts are often root-owned; the API process runs as non-root `app`.
if id app >/dev/null 2>&1; then
  chown -R app:app "${UPLOADS}" /app/DataProtection-Keys 2>/dev/null || true
  chmod -R u+rwX "${UPLOADS}" 2>/dev/null || true
  exec su -s /bin/sh app -c 'exec dotnet /app/GymManagement.API.dll'
fi

exec dotnet /app/GymManagement.API.dll
