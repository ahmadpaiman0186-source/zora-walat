import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../services/auth_api_service.dart';

/// Email-first OTP sign-in entry screen.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  String _normalizeEmail(String email) => email.trim().toLowerCase();

  bool _validateEmail(String email, AppLocalizations l10n) {
    final t = _normalizeEmail(email);
    if (t.isEmpty) {
      setState(() => _error = l10n.authEmailRequired);
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
    final email = _normalizeEmail(_email.text);
    if (!_validateEmail(email, l10n)) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final authApi = AppScope.of(context).authApiService;

    try {
      final result = await authApi.requestOtp(email: email);
      if (!mounted) return;
      final target =
          '${AppRoutePaths.signInOtp}?email=${Uri.encodeQueryComponent(email)}';
      await context.push(target, extra: result.message);
    } on AuthApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = _mapRequestError(e, l10n));
    } catch (_) {
      setState(() => _error = l10n.authGenericError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _mapRequestError(AuthApiException error, AppLocalizations l10n) {
    if (error.isNetworkError) return l10n.authNetworkRetry;
    if (error.statusCode == 429) return l10n.authOtpTooManyAttempts;
    return l10n.authGenericError;
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
          onPressed: () => context.canPop()
              ? context.pop()
              : context.go(AppRoutePaths.landing),
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
            Text(
              l10n.authOtpEmailIntro,
              style: t.textTheme.bodyMedium?.copyWith(
                color: t.colorScheme.outline,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              autocorrect: false,
              enabled: !_busy,
              decoration: InputDecoration(
                labelText: l10n.authEmailLabel,
                border: const OutlineInputBorder(),
              ),
              onSubmitted: (_) => _busy ? null : _submit(),
            ),
            const SizedBox(height: 16),
            Text(
              l10n.authOtpEmailHelp,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
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
                  : Text(l10n.authOtpContinueCta),
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
