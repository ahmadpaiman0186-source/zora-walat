import 'package:flutter/foundation.dart' show debugPrint, kDebugMode;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/firebase_backend_session_sync.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../services/firebase_auth_service.dart';

/// Firebase email/password sign-in, then sync JWT for the Node API.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _firebaseAuth = FirebaseAuthService();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  bool _validateEmail(String email, AppLocalizations l10n) {
    final t = email.trim();
    if (t.isEmpty) {
      setState(() => _error = l10n.authFillAllFields);
      return false;
    }
    final ok = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(t);
    if (!ok) {
      setState(() => _error = l10n.authInvalidEmail);
      return false;
    }
    return true;
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final email = _email.text.trim();
    final password = _password.text;
    if (!_validateEmail(email, l10n)) return;
    if (password.isEmpty) {
      setState(() => _error = l10n.authFillAllFields);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    final authApi = AppScope.of(context).authApiService;
    final session = AppScope.authSessionOf(context);

    try {
      await _firebaseAuth.signInWithEmailPassword(email: email, password: password);
      try {
        await syncBackendSessionAfterFirebaseSignIn(
          authApi: authApi,
          session: session,
          email: email,
          password: password,
        );
      } catch (e, st) {
        await _firebaseAuth.signOut();
        if (kDebugMode) {
          debugPrint('backend sync after Firebase sign-in failed: $e');
          debugPrint('$st');
        }
        final message = e is StateError
            ? e.message
            : (kDebugMode ? e.toString() : l10n.authGenericError);
        if (!mounted) return;
        setState(() => _error = message);
        return;
      }
      if (!mounted) return;
      context.go(AppRoutePaths.hub);
    } on FirebaseAuthServiceException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('sign-in failed: $e');
        debugPrint('$st');
      }
      if (!mounted) return;
      setState(() => _error = l10n.authGenericError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.authSignInTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go(AppRoutePaths.landing),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Text(
                _error!,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: t.colorScheme.error,
                ),
              ),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              decoration: InputDecoration(
                labelText: l10n.authEmailLabel,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.authPasswordLabel,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l10n.authSignInCta),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: _busy ? null : () => context.push(AppRoutePaths.signUp),
              child: Text(l10n.authSwitchToRegister),
            ),
          ],
        ),
      ),
    );
  }
}
