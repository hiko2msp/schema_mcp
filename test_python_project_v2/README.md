# Button Counter

A simple FastAPI application with SQLite database that tracks button clicks per user.

## Features

- FastAPI web server with SQLite database
- Track click counts for individual users
- Simple HTML/JavaScript frontend
- RESTful API endpoints
- pytest integration tests

## Prerequisites

- Python 3.11 or higher
- uv (Python package manager)

## Installation

1. Navigate to the project directory:
   ```bash
   cd test_python_project
   ```

2. Install dependencies with uv:
   ```bash
   uv sync
   ```

3. (Optional) Install development dependencies:
   ```bash
   uv sync --extra dev
   ```

## Running the Application

Start the development server:
```bash
uv run uvicorn app.main:app --reload
```

The server will start on `http://localhost:8000`

## API Endpoints

### Web Interface
- `GET /` - Button counter HTML interface

### API Endpoints
- `POST /api/click/{user_id}` - Increment click count for a user
- `GET /api/clicks/{user_id}` - Get current click count for a user

## Usage

1. Open your browser and navigate to `http://localhost:8000`
2. Enter a user ID and click "Set User"
3. Click the "Click Me!" button to increment the counter
4. The count is saved to the SQLite database

## Testing

Run the test suite:
```bash
uv run pytest
```

Run tests with verbose output:
```bash
uv run pytest -v
```

## Database

The application uses SQLite with the file `click_counter.db`. The database is automatically created on first run.

### Database Schema

**user_clicks** table:
- `id` (Integer, Primary Key)
- `user_id` (String, Unique)
- `click_count` (Integer)
- `updated_at` (DateTime)

## Project Structure

```
test_python_project/
├── pyproject.toml          # Project configuration and dependencies
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── database.py       # Database configuration
│   └── models.py         # SQLAlchemy models
├── tests/
│   ├── __init__.py
│   └── test_app.py       # API tests
└── static/
    └── index.html        # Frontend interface
```

## Development

The application uses:
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **Uvicorn** - ASGI server
- **Pytest** - Testing framework

All configuration is managed through `pyproject.toml`.

## License

MIT
