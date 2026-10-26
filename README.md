# SS Europa — Admin & Staff Dashboard

React 19 / TypeScript / Vite management portal for Teachers (Mentors), Admissions Staff, and Administrators.

## Overview

This dashboard communicates with the **.NET 10 Web API** (`ITALIA-backend`) and serves as the internal operations center for SS Europa:

- 🎓 **Curriculum & Materials**: Create courses, manage capacity, and upload video/audio/document lessons.
- 📅 **Live Class Scheduling**: Schedule Google Meet sessions and notify enrolled mobile students.
- 📥 **Admissions & Enquiries Desk**: Review leads and contact requests submitted from the public website (`ITALIA`) and track follow-ups.
- 👥 **User & Role Administration**: Oversee student enrollments, mentor assignments, and staff roles.
- 🤖 **AI Assistant Playground**: Test and audit AI tutor and translator prompt workflows.

## Prerequisites

- Node.js 20+ / npm 10+
- Running backend API (`ITALIA-backend` on port `5057`)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment configuration:
   The `.env` file points to the backend:
   ```env
   VITE_API_BASE_URL=http://localhost:5057
   ```

3. Run development server:
   ```bash
   npm run dev
   ```
   The application will start on **http://localhost:5173**.

4. Production build:
   ```bash
   npm run build
   ```

## Demo Accounts

You can sign in instantly using the demo tiles on the login page:

| Email | Role | Responsibilities |
|---|---|---|
| `mentor@sseuropa.demo` | Teacher (Mentor) | Courses, lessons, live classes, alerts |
| `staff@sseuropa.demo` | Staff (Admissions) | Website contact requests & lead conversion |
| `admin@sseuropa.demo` | Administrator | Curriculum, staff management, stats |
| `superadmin@sseuropa.demo` | Super Admin | Full governance & system logs |

Password for password+OTP login: `Demo@12345`

