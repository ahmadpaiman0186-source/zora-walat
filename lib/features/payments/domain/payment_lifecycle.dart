/// Lifecycle for a checkout session (maps to webhooks / reconciliation later).
enum PaymentLifecycle {
  idle,
  intentCreated,
  processing,
  succeeded,
  failed,
  cancelled,
}
