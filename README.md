# Cyber Fraud Correlator

A full-stack browser-based web application for cyber fraud analysis and entity correlation.

---

## Project Structure

```text
cyber-fraud-correlator/
├── backend/
│   ├── main.py              # Minimal FastAPI application with health check and CORS
│   ├── correlation_engine.py # Entity correlation logic
│   ├── test_correlation.py   # Standalone test script for correlation logic
│   ├── requirements.txt      # Python dependencies
│   └── .gitignore            # Python gitignore rules
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Application pages
│   │   ├── App.jsx           # Homepage querying backend health endpoint
│   │   ├── main.jsx          # React DOM entry point
│   │   └── index.css         # Tailwind CSS imports and base styles
│   ├── index.html            # Vite HTML shell
│   ├── package.json          # Node dependencies and scripts
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── postcss.config.js     # PostCSS configuration
│   └── .gitignore            # Frontend gitignore rules
├── sample-data/              # Sample CSV files for testing
├── docs/                     # Documentation and demo scripts
└── README.md                 # Project instructions and documentation
```

---

## Getting Started

This application is browser-based only and runs locally via `localhost` during development.

### 1. Running the Backend

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

Create and activate a virtual environment:

- **Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI development server:

```bash
uvicorn main:app --reload
```

The backend server will run at [http://localhost:8000](http://localhost:8000).  
The health check endpoint is available at [http://localhost:8000/api/health](http://localhost:8000/api/health).  
Interactive Swagger API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Running the Frontend

Open a second terminal and navigate to the `frontend` directory:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend application will be available at [http://localhost:5173](http://localhost:5173). On load, it connects to the FastAPI backend health endpoint and displays the connection status.
