class RechargePackage {
  const RechargePackage({
    required this.id,
    required this.label,
    required this.type,
    required this.priceUsd,
  });

  final String id;
  final String label;
  final String type;
  final double priceUsd;

  factory RechargePackage.fromJson(Map<String, dynamic> json) {
    return RechargePackage(
      id: json['id'] as String,
      label: json['label'] as String,
      type: json['type'] as String? ?? 'data',
      priceUsd: (json['priceUsd'] as num).toDouble(),
    );
  }
}
