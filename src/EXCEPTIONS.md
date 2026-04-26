# Exception Handling Guidelines

This project uses typed domain exceptions for business/API behavior.

## Goals

- Keep service-layer errors explicit and predictable.
- Return consistent API responses through global `ProblemDetails` middleware.
- Avoid fragile message-based `catch` logic in controllers.

## Exception Types

Defined in `GymManagement.Core/Exceptions`:

- `BadRequestException` -> HTTP `400`
- `NotFoundException` -> HTTP `404`
- `ConflictException` -> HTTP `409`
- `DomainException` (base class)

Global mapping is implemented in:

- `GymManagement.API/Middleware/GlobalExceptionMiddleware.cs`

## Where to Throw

Throw in service layer (`GymManagement.Infrastructure/Services/*`):

- `BadRequestException`
  - Invalid input values and rule violations tied to request shape/value.
  - Example: rating outside allowed range.
- `NotFoundException`
  - Required entity/resource does not exist.
  - Example: membership/plan/user not found.
- `ConflictException`
  - Operation conflicts with current data state.
  - Example: duplicate unique values, already checked-in/out, duplicate role name.

## Controller Pattern

Preferred controller pattern:

- Do not wrap every service call in `try/catch` for business exceptions.
- Let domain exceptions bubble to global middleware.
- Keep explicit controller checks only for `null` results when method contract returns nullable (`T?` / `bool`).

Good:

- `if (entity == null) return NotFound();`
- otherwise return success result and rely on middleware for thrown exceptions.

Avoid:

- `catch (InvalidOperationException ex)` with message inspection.

## Non-Business Exceptions

Keep generic exceptions only where appropriate:

- Startup/config bootstrapping in `Program.cs` (fail fast on invalid config).
- Middleware fallback mapping for unexpected runtime exceptions.

## Adding New Services

When implementing new business logic:

1. Choose the appropriate domain exception type.
2. Throw typed exception from service methods.
3. Do not duplicate response mapping in controller.
4. Add/update tests to assert expected status code behavior.

## Status Code Reference

- 400: Request data invalid for the operation.
- 404: Resource required for operation not found.
- 409: State conflict (duplicate/already exists/already processed).
- 500: Unexpected unhandled server error.
