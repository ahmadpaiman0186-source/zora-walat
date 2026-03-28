class PhoneNumber {
  const PhoneNumber(this.raw);

  final String raw;

  String get display {
    final t = raw.trim();
    if (t.isEmpty) return '—';
    return t;
  }
}
