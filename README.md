# Real-time Real Estate Investment Analysis

## Project Overview
This project is part of CS682 and focuses on developing a real estate investment analysis tool to help investors evaluate potential property deals. The application will feature investment calculators that minimize user input by retrieving data from real estate platforms like Zillow, Redfin, and Realtor.com.

The platform will provide insights into cash flow, property valuation, and profit analysis while allowing users to generate investment reports. Our goal is to build a responsive web application that integrates with available real estate APIs to assist investors in making data-driven decisions.

## Getting Started

### Backend Setup
> **Note:** If `python` or `pip` commands don't work, try using `python3` or `pip3` instead.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv   # or: python3 -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt   # or: pip3 install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env` (if not exists)
   - Configure your environment variables

5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The server will run on `http://localhost:8000`

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local` (if not exists)
   - Configure your environment variables

4. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

