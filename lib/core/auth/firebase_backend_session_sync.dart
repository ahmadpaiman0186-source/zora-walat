import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;

import '../../services/auth_api_service.dart';
import 'auth_session.dart';

/// Links Firebase identity to the Node API JWT session (same email/password).
///
/// **Trust model:** Firebase proves the user completed email/password sign-up in the client SDK.
/// The API user row is created here with the same password. Firebase ID tokens are never sent to the API.
Future<void> syncBackendSessionAfterFirebaseSignUp({
  required AuthApiService authApi,
  required AuthSession session,
  required String email,
  required String password,
}) async {
  try {
    final pair = await authApi.register(email: email, password: password);
    await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
  } on AuthApiException catch (e) {
    final likelyExists =
        e.statusCode == 409 ||
        e.errorCode == 'auth_email_exists';
    if (likelyExists) {
      final pair = await authApi.login(email: email, password: password);
      await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
      return;
    }
    rethrow;
  }
}

/// After Firebase sign-in, obtain API JWTs using the same credentials.
///
/// Order: API [login] → on **401** (no session / wrong password / missing user), [register] once to
/// bootstrap a new API user, or on **409** [login] again (race: account created between calls).
/// Network and non-auth failures are **not** converted into register attempts.
Future<void> syncBackendSessionAfterFirebaseSignIn({
  required AuthApiService authApi,
  required AuthSession session,
  required String email,
  required String password,
}) async {
  try {
    final pair = await authApi.login(email: email, password: password);
    await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
  } on AuthApiException catch (e) {
    if (e.isNetworkError) rethrow;
    if (e.statusCode != 401) rethrow;

    try {
      final pair = await authApi.register(email: email, password: password);
      await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
    } on AuthApiException catch (e2) {
      if (e2.isNetworkError) rethrow;
      if (e2.statusCode == 409 || e2.errorCode == 'auth_email_exists') {
        if (kDebugMode) {
          debugPrint(
            'syncBackendSessionAfterFirebaseSignIn: register race/email exists, retry login',
          );
        }
        final pair = await authApi.login(email: email, password: password);
        await session.setTokens(access: pair.accessToken, refresh: pair.refreshToken);
        return;
      }
      rethrow;
    }
  }
}
