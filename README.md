# Thrissur Multi-Shop Vehicle Rental Management System

A new independent Spring Boot + MySQL vehicle rental project built around a Thrissur, Kerala rental platform.

## Features
- Customer registration and login
- Shop owner registration, approval flow, authenticated dashboard, profile, vehicle, booking, customer, and report pages
- Platform admin login using a database-backed account
- Public vehicle browsing
- Booking flow with overlap prevention
- Shop-level vehicle management
- Dashboard screens and landing page styled to match the provided reference

## Run backend
cd backend
mvn spring-boot:run

The default datasource is MySQL. Create `thrissur_vehicle_rental` using
`database/vehicle_rental.sql`, then set `DB_USERNAME` and `DB_PASSWORD` (and
optionally `DB_URL`). For an isolated non-persistent smoke test only, run:
`mvn spring-boot:run "-Dspring-boot.run.profiles=h2"`.

## Access frontend
Open the app at http://localhost:8080/

Shop owner routes:
- http://localhost:8080/shop/register
- http://localhost:8080/shop/login
- http://localhost:8080/shop/dashboard

Shop registration always starts as `PENDING`. Use an authenticated admin session to approve:
`POST /api/admin/shops/{shopId}/approve`

Browser authentication uses an HttpOnly session cookie and CSRF protection. The frontend
must use the configured origin; set `FRONTEND_ORIGINS` to a comma-separated list of
exact production origins. Client-supplied `shopId` values are not used for authorization.

Shop owner API endpoints:
- `POST /api/auth/shop/register`
- `POST /api/auth/shop/login`
- `GET/PATCH /api/shop/profile`
- `GET/POST /api/shop/vehicles`
- `PUT /api/shop/vehicles/{vehicleId}`
- `PATCH /api/shop/vehicles/{vehicleId}/status`
- `POST /api/shop/vehicles/{vehicleId}/image` (multipart field: `image`; JPG, PNG, WEBP, max 5 MB)
- `GET /api/shop/bookings`
- `PATCH /api/shop/bookings/{rentalId}/status`
- `GET /api/shop/customers`
- `GET /api/shop/reports`

Admin API endpoints (session-authenticated):
- `GET /api/admin/dashboard`
- `GET /api/admin/shops`
- `GET /api/admin/vehicles`
- `GET /api/admin/customers`
- `GET /api/admin/bookings`
- `GET /api/admin/rentals`
- `GET /api/admin/reports`
- `POST /api/admin/shops/{shopId}/approve|reject|suspend|reactivate`
- `DELETE /api/admin/shops/{shopId}` (deletes the shop and its vehicles/bookings)

## Database
MySQL is the active default datasource. Set `DB_URL`, `DB_USERNAME`, and
`DB_PASSWORD` through the environment; do not commit them. Hibernate uses
`ddl-auto=update` for the existing non-destructive schema behavior, but review
and back up the database before deployment. The H2 profile is for isolated
local smoke tests and its console is disabled by default.

For a one-time initial administrator, set `BOOTSTRAP_ADMIN_ENABLED=true`,
`BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` only in the deployment
environment, start the application, then remove or disable those variables.
An existing administrator is never reset by startup.

For production, set `SESSION_COOKIE_SECURE=true` behind an HTTPS reverse proxy.
The reverse proxy must redirect HTTP to HTTPS and pass the original HTTPS scheme.
Use a dedicated MySQL user with only the application's required database
permissions, and back up before migrations:

```text
mysqldump --single-transaction --routines --triggers thrissur_vehicle_rental > backup.sql
mysql thrissur_vehicle_rental < backup.sql
```

Create the least-privileged account using your deployment-specific username and
host, then grant only the required schema permissions; never place its password
in this repository. Verify restore into a separate database before a production
migration.

## Project structure
- `backend/` - Spring Boot app
- `frontend/` - static frontend assets (kept minimal with the Spring static folder)
- `database/` - SQL seed scripts
- `images/vehicles/` - vehicle image storage
