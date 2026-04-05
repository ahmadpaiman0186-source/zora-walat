/// Where order list data came from for customer visibility (not raw API enums).
enum OrderSyncSource {
  /// Server-backed, tied to the signed-in account.
  account,

  /// Device cache only (unsigned, or order not yet visible on account).
  device,
}
