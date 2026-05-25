# Gym Management Application

A comprehensive Gym Management System built with .NET 9.0 (Entity Framework Core) backend and React with TypeScript frontend.

## Features

1. **Body Parts & Exercises Management**
   - Record every body part with exercises
   - Exercises include mandatory steps and optional video URLs
   - Track difficulty levels and equipment required

2. **Workout Plans**
   - Warmup plans
   - Short HIIT workout plans
   - Long HIIT workout plans
   - Strength training plans
   - Cardio plans

3. **User Management**
   - Complete user profiles with personal details
   - Track user measurements (Height, Weight, BMR, BMI, Body Fat %, Muscle Mass)
   - Historical measurement tracking

4. **Instructor Management**
   - Instructor profiles and information
   - Assign instructors to workout plans and user schedules

5. **Schedule Management**
   - Manual schedule creation
   - Automatic default schedule generation:
     - **One Muscle Per Day**: Assigns one muscle group per day (Monday - Chest, Tuesday - Back, etc.)
     - **Two Muscles Per Day**: Assigns two muscle groups per day
   - Custom scheduling options

6. **Progress Tracking**
   - Track user progress over time
   - Record weight, body fat, muscle mass, BMI, BMR
   - Store progress pictures
   - Add notes for each measurement

## Documentation (flows & conventions)

All flow, identity, and reuse docs are in **[docs/knowledge-base/](docs/knowledge-base/README.md)**:

- **[docs/knowledge-base/README.md](docs/knowledge-base/README.md)** — index (start here)
- **[APPLICATION_FLOWS.md](docs/knowledge-base/APPLICATION_FLOWS.md)** — product flows, API map, identity model
- **[REUSE_AND_CONVENTIONS.md](docs/knowledge-base/REUSE_AND_CONVENTIONS.md)** — reuse catalog & checklists
- **[USER_ROLE_ARCHITECTURE.md](docs/knowledge-base/USER_ROLE_ARCHITECTURE.md)** — roles, profiles, provisioning
- **[AGENTS.md](AGENTS.md)** — quick index for AI assistants

Also: [docs/CodeWorkflow.md](docs/CodeWorkflow.md) · [docs/PT_MODULE.md](docs/PT_MODULE.md) · [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## Architecture

### Backend (.NET)
- **Clean Architecture** with separation of concerns
- **Repository Pattern** with Unit of Work
- **Entity Framework Core** for data access
- **SQL Server** database

**Project Structure:**
```
src/
├── GymManagement.Domain/          # Domain entities and enums
├── GymManagement.Core/            # Interfaces, DTOs, and Service interfaces
├── GymManagement.Infrastructure/  # EF Core, Repositories, Service implementations
└── GymManagement.API/             # REST API Controllers
```

### Frontend (React + TypeScript)
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Axios** for API communication

**Frontend Structure:**
```
frontend/
├── src/
│   ├── pages/          # Page components
│   ├── services/       # API service layer
│   ├── types/          # TypeScript type definitions
│   └── App.tsx         # Main app component
```

## Setup Instructions

### Prerequisites
- .NET 9.0 SDK
- Node.js 18+ and npm
- SQL Server (LocalDB or SQL Server Express)

### Backend Setup

1. Navigate to the API project:
```bash
cd src/GymManagement.API
```

2. Update the connection string in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Your SQL Server connection string"
  }
}
```

3. Restore packages and build:
```bash
dotnet restore
dotnet build
```

4. Run the application:
```bash
dotnet run
```

The API will be available at `http://localhost:5000` (or https://localhost:5001)

API Swagger documentation: `http://localhost:5000/swagger`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Database

**Quick Setup (Recommended for Development):**

The easiest way to get started is to use SQLite (no server installation required):

1. Open `GymManagement.API/appsettings.Development.json`
2. Set `"UseSqlite": true`
3. Run the application - SQLite database will be created automatically as `gymmanagement.db`

**Using SQL Server LocalDB:**

1. Install SQL Server LocalDB if not already installed
2. Ensure `UseSqlite` is set to `false` in appsettings.json
3. Update the connection string if needed in `appsettings.json`
4. The database will be automatically created when you first run the API

**Using Full SQL Server:**

Update the connection string in `appsettings.json`:
```json
{
  "UseSqlite": false,
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=GymManagementDb;User Id=sa;Password=YourPassword;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

**Troubleshooting:**

If you encounter LocalDB connection errors, see `DATABASE_SETUP.md` or `QUICK_FIX_DATABASE.md` for detailed solutions.

For production, use Entity Framework migrations:
```bash
cd src/GymManagement.API
dotnet ef migrations add InitialCreate --project ../GymManagement.Infrastructure --startup-project .
dotnet ef database update
```

## API Endpoints

### Users
- `GET /api/Users` - Get all users
- `GET /api/Users/{id}` - Get user by ID
- `POST /api/Users` - Create user
- `PUT /api/Users/{id}` - Update user
- `DELETE /api/Users/{id}` - Delete user
- `GET /api/Users/{id}/details` - Get user details/measurements
- `POST /api/Users/details` - Add user measurement

### Exercises
- `GET /api/Exercises` - Get all exercises
- `GET /api/Exercises/{id}` - Get exercise by ID
- `GET /api/Exercises/bodypart/{bodyPartId}` - Get exercises by body part
- `POST /api/Exercises` - Create exercise
- `PUT /api/Exercises/{id}` - Update exercise
- `DELETE /api/Exercises/{id}` - Delete exercise

### Body Parts
- `GET /api/BodyParts` - Get all body parts
- `GET /api/BodyParts/{id}` - Get body part by ID
- `POST /api/BodyParts` - Create body part
- `DELETE /api/BodyParts/{id}` - Delete body part

### Workout Plans
- `GET /api/WorkoutPlans` - Get all workout plans
- `GET /api/WorkoutPlans/{id}` - Get workout plan by ID
- `GET /api/WorkoutPlans/type/{workoutType}` - Get workout plans by type
- `POST /api/WorkoutPlans` - Create workout plan
- `DELETE /api/WorkoutPlans/{id}` - Delete workout plan

### User Schedules
- `GET /api/UserSchedules` - Get all schedules
- `GET /api/UserSchedules/{id}` - Get schedule by ID
- `GET /api/UserSchedules/user/{userId}` - Get schedules by user
- `POST /api/UserSchedules` - Create schedule
- `POST /api/UserSchedules/generate-default` - Generate default schedule
- `PUT /api/UserSchedules/{id}` - Update schedule
- `DELETE /api/UserSchedules/{id}` - Delete schedule

### Instructors
- `GET /api/Instructors` - Get all instructors
- `GET /api/Instructors/{id}` - Get instructor by ID
- `POST /api/Instructors` - Create instructor
- `DELETE /api/Instructors/{id}` - Delete instructor

### Progress Tracking
- `GET /api/ProgressTracking` - Get all progress trackings
- `GET /api/ProgressTracking/{id}` - Get progress tracking by ID
- `GET /api/ProgressTracking/user/{userId}` - Get progress trackings by user
- `POST /api/ProgressTracking` - Create progress tracking
- `DELETE /api/ProgressTracking/{id}` - Delete progress tracking

## Default Schedule Generation

The system can automatically generate default schedules based on available body parts and workout plans:

1. **One Muscle Per Day**: 
   - Assigns one body part per day
   - Cycles through all available body parts
   - Example: Monday - Chest, Tuesday - Back, Wednesday - Legs, etc.

2. **Two Muscles Per Day**:
   - Assigns two body parts per day
   - Example: Monday - Chest & Back, Tuesday - Legs & Shoulders, etc.

The system will use available workout plans and distribute them across the week.

## Notes

- All entities support soft delete (IsDeleted flag)
- Timestamps (CreatedDate, UpdatedDate) are automatically managed
- BMI and BMR are automatically calculated when adding user details
- The frontend includes form validation and error handling
- CORS is configured to allow the React app to communicate with the API

## License

This project is for educational purposes.

