import 'dart:convert';

/// Reads JWT payload without verification (client display only; server validates).
Map<String, dynamic>? decodeJwtPayload(String? token) {
  if (token == null || token.trim().isEmpty) return null;
  final parts = token.split('.');
  if (parts.length != 3) return null;
  try {
    var s = parts[1];
    switch (s.length % 4) {
      case 2:
        s += '==';
        break;
      case 3:
        s += '=';
        break;
    }
    final bytes = base64Url.decode(s);
    final obj = jsonDecode(utf8.decode(bytes));
    if (obj is Map<String, dynamic>) return obj;
    return null;
  } catch (_) {
    return null;
  }
}

String? jwtSubject(String? token) {
  final m = decodeJwtPayload(token);
  final sub = m?['sub'];
  if (sub is String && sub.isNotEmpty) return sub;
  return null;
}
