#!/bin/sh
set -eu

UPLOADS="/app/wwwroot/uploads"

# Ensure upload tree exists (Docker volume mount may hide image dirs or be root-owned).
for dir in \
  "${UPLOADS}/profiles/users" \
  "${UPLOADS}/profiles/trainers" \
  "${UPLOADS}/body/users" \
  "${UPLOADS}/body-parts"; do
  mkdir -p "${dir}"
done

# Volume mounts are often root-owned; the API process runs as non-root `app`.
if id app >/dev/null 2>&1; then
  chown -R app:app "${UPLOADS}" 2>/dev/null || true
  chmod -R u+rwX "${UPLOADS}" 2>/dev/null || true
  exec su -s /bin/sh app -c 'exec dotnet /app/GymManagement.API.dll'
fi

exec dotnet /app/GymManagement.API.dll
