# Proto1_aarvasa_backend

This repository contains the backend microservices architecture for a real estate platform similar to MagicBricks, 99acres, or Housing.com. It is built using Node.js, Express, PostgreSQL (with PostGIS), Redis, and Docker.

---

## Project Overview

The platform is designed as a microservices system with an API Gateway. The initial setup includes:

- **User Service**: Manages user registration, authentication, roles (admin, agent, buyer), and session management.
- **API Gateway**: Routes incoming requests to appropriate microservices.
- **PostgreSQL** with PostGIS: Stores relational and geospatial data.
- **Redis**: Used for caching user sessions.

---

## Directory Structure
real-estate-platform/
├── services/
│ ├── user-service/
│ │ ├── src/
│ │ │ ├── controllers/
│ │ │ ├── middleware/
│ │ │ ├── models/
│ │ │ ├── routes/
│ │ │ ├── services/
│ │ │ └── config/
│ │ ├── package.json
│ │ ├── Dockerfile
│ │ └── .env
│ ├── api-gateway/
│ │ ├── src/
│ │ │ ├── routes/
│ │ │ ├── middleware/
│ │ │ └── config/
│ │ ├── package.json
│ │ ├── Dockerfile
│ │ └── .env
├── shared/
│ ├── utils/
│ └── constants/
├── docker-compose.yml
├── .gitignore
└── README.md



---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed (for local development/testing)
- PostgreSQL and Redis (can be run via Docker Compose)

---

### Installation and Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd real-estate-platform


docker-compose up -d postgres redis

cd services/user-service
npm install
npm run dev

cd ../api-gateway
npm install
npm run dev


