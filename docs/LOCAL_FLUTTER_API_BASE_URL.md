# Local Flutter API base URL

Run Chrome against the Node API on port **8787**:

```text
flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8787
```

Source of truth: `lib/core/config/app_config.dart` (`API_BASE_URL`).

**Do not commit** secrets. Use `server/.env` for Stripe/DB locally.
