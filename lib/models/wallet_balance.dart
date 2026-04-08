class WalletBalance {
  const WalletBalance({
    required this.balance,
    required this.currency,
    this.idempotentReplay,
  });

  final double balance;
  final String currency;

  /// When present (POST /api/wallet/topup), `true` means no new credit (safe retry).
  final bool? idempotentReplay;

  factory WalletBalance.fromJson(Map<String, dynamic> json) {
    return WalletBalance(
      balance: (json['balance'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      idempotentReplay: json['idempotentReplay'] as bool?,
    );
  }
}
