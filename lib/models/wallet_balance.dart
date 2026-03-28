class WalletBalance {
  const WalletBalance({
    required this.balance,
    required this.currency,
  });

  final double balance;
  final String currency;

  factory WalletBalance.fromJson(Map<String, dynamic> json) {
    return WalletBalance(
      balance: (json['balance'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'USD',
    );
  }
}
