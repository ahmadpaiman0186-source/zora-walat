import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;

import '../../services/auth_api_service.dart';
import 'auth_session.dart';

/// Links Firebase identity to the Node API JWT session (same email/password).
Future<void> syncBackendSessionAfterFirebaseSignUp({
  required AuthApiService authApi,
  required AuthSession session,
  required String email,
  required String password,
}) async {
  try {
    final pair = await authApi.register(email: email, password: password);
    await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
  } catch (e) {
    final msg = e is StateError ? e.message : e.toString();
    final lower = msg.toLowerCase();
    final likelyExists =
        lower.contains('exist') ||
        lower.contains('already') ||
        lower.contains('taken') ||
        lower.contains('duplicate');
    if (likelyExists) {
      final pair = await authApi.login(email: email, password: password);
      await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
      return;
    }
    rethrow;
  }
}

/// Prefer login; if the API user was never created, register once.
Future<void> syncBackendSessionAfterFirebaseSignIn({
  required AuthApiService authApi,
  required AuthSession session,
  required String email,
  required String password,
}) async {
  try {
    final pair = await authApi.login(email: email, password: password);
    await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
  } catch (e) {
    if (kDebugMode) {
      debugPrint('backend login after Firebase failed, trying register: $e');
    }
    final pair = await authApi.register(email: email, password: password);
    await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
  }
}
