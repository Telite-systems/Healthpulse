# HealthPulse Project Context

## Project Overview
HealthPulse is a healthcare automation platform that combines a modern web frontend with a Python/FastAPI backend and MongoDB persistence. The project includes telemedicine, clinic management, scheduling, patient records, dashboard analytics, and support for real-time communication.

The repository appears to be organized into multiple related apps and deployment artifacts:
- `healthcare-app/` — React + Vite frontend for the main application UI.
- `healthcare-backend/` — FastAPI backend with MongoDB database access, authentication, generic CRUD routes, WebSocket event handling, and call signaling.
- `Healthpulse/` and duplicate folder copies — likely alternate workspace or packaged deployment version of the same app.
- `pyro-meteor/` — additional web app folder that may contain another frontend variant.
- `n8n workflow/` — saved n8n workflow JSON files for automation.
- deployment scripts and docs at repository root (`deploy-ec2.sh`, `docker-compose*.yml`, `AWS_DEPLOYMENT.md`, etc.).

## Architecture

### Frontend
- Built with React, Vite, TypeScript, and Lucide icons.
- Uses a context-based auth provider (`AuthContext`) and a singleton `callService` for signaling.
- Connects to backend APIs via `api.ts` using relative `/api/*` routes.
- Supports offline/mock login fallback for users when backend auth is unavailable.
- Includes telemedicine UI and an embedded ZEGOCLOUD UIKit video call component (`ZegoCallRoom`).

### Backend
- FastAPI application with async MongoDB access via Motor.
- Auth service handles JWT creation, decoding, and password hashing.
- Routes include `/api/auth/*`, generic `/api/<collection>` CRUD, dashboard endpoints, WebSocket event routes, and real-time call signaling routes.
- Signaling is implemented with per-user WebSocket endpoints at `/ws/call/{user_id}`.
- Includes database seeding for users, doctors, patients, appointments, and other healthcare data.

### Real-Time Call Signaling
- Frontend connects to a WebSocket URL including the authenticated user ID and name.
- The backend maintains a registry of active user WebSocket connections.
- Call messages are routed by target user ID to support cross-browser/device calls.
- ZEGOCLOUD room IDs are generated deterministically from caller and callee IDs.
- A BroadcastChannel fallback is used for same-browser signaling when WS is unavailable.

## Implemented Features

### Authentication & User Session
- JWT-based backend login and token validation.
- Patient registration endpoint.
- Mock offline login fallback with predefined doctor, staff, patient credentials.
- Frontend auth context to manage login, logout, session expiration, and token persistence.
- `AuthContext` validation on mount and session management.

### Telemedicine & Call Flow
- Telemedicine page with doctor search, filtering, and call initiation.
- Call service for initiating, accepting, rejecting, and ending calls.
- Incoming call popup UI for doctors to accept or reject incoming calls.
- Real video/audio call integration via ZEGOCLOUD UIKit.
- Deterministic ZEGOCLOUD room ID generation for two participants.
- Caller waits for acceptance before launching the ZEGOCLOUD room.
- On acceptance, both caller and callee open the same ZEGOCLOUD room.

### Backend Signaling & WebSocket Support
- Per-user call signaling endpoint at `/ws/call/{user_id}`.
- Server-side routing of `call_initiate`, `call_accept`, `call_reject`, and `call_end` messages.
- Online user tracking and delivery feedback for call initiation.
- Generic `/api/call/online` endpoint for debugging connected users.

### Data & CRUD Support
- Generic CRUD router factory for collections like `patients`, `doctors`, `staff`, `departments`, `appointments`, `visits`, `billing`, `prescriptions`, and `notifications`.
- Data seeding for users and domain entities if collections are empty.
- Backend database health check endpoint.

### Deployment & Dev Tools
- Docker compose files for local and AWS deployment.
- Deployment documentation files for cloud setup and quick start.
- Scripts for EC2 deployment and health checks.
- Frontend Vite build and production-ready bundling.

## Key Project Files
- `healthcare-app/src/pages/Telemedicine.tsx` — telemedicine UI and call flow management.
- `healthcare-app/src/components/ZegoCallRoom.tsx` — video call room rendering and ZEGOCLOUD integration.
- `healthcare-app/src/services/callService.ts` — browser-side signaling layer and WebSocket fallback.
- `healthcare-app/src/services/api.ts` — API client and auth login fallback.
- `healthcare-backend/app/main.py` — FastAPI app startup, route registration, lifecycle.
- `healthcare-backend/app/routes/auth.py` — login, registration, token validation.
- `healthcare-backend/app/routes/signaling.py` — WebSocket call signaling manager.
- `healthcare-backend/app/seed.py` — initial database seeding.
- `healthcare-backend/app/services/auth.py` — JWT handling and current-user lookup.

## Notes on Current State
- The app already includes working frontend build support and has been compiled successfully.
- Real-time call signaling and a telemedicine UI are implemented, but some cross-browser signaling and backend authentication consistency issues were being debugged in the current session.
- The code contains multiple related workspace copies and deployment folders, indicating both local and packaged project variations.

## Usage Summary
- Run backend with FastAPI and MongoDB.
- Run frontend with Vite and connect to backend via proxied `/api` and `/ws` routes.
- Use the telemedicine page to select a doctor and initiate a video/voice call.
- Doctors receive incoming calls via WebSocket and can accept to join the same ZEGOCLOUD room.

---
Generated on June 2, 2026.