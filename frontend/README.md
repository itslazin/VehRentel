# Thrissur Vehicle Rental frontend

This frontend uses only HTML5, CSS3 and vanilla JavaScript. It calls the Spring Boot API configured in `js/api.js`:

```text
http://localhost:8080/api
```

Run the backend first:

```powershell
cd ..\backend
mvn spring-boot:run
```

Then serve this folder with any static file server. For example:

```powershell
cd ..\frontend
python -m http.server 5500
```

Open `http://localhost:5500/index.html`.

The current backend supports public vehicles/shops, customer registration/login,
shop registration/login, shop owner dashboards and management, admin approval,
and protected admin dashboard, shops, vehicles, customers, bookings, rentals,
and reports data. API failures display the HTTP status, endpoint, backend
message, and response body when available.

The current backend does not yet expose complaint persistence, customer profile updates, customer cancellation, or customer return-request endpoints. Those screens show an explicit integration message rather than submitting fake data.
