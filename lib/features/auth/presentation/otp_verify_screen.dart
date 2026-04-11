import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../services/auth_api_service.dart';

class OtpVerifyScreen extends StatefulWidget {
  const OtpVerifyScreen({
    super.key,
    required this.email,
  });

  final String email;

  @override
  State<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends State<OtpVerifyScreen> {
  static const int _resendCooldownSeconds = 60;

  final _otp = TextEditingController();
  Timer? _timer;
  bool _busy = false;
  int _remainingSeconds = _resendCooldownSeconds;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    _info = null;
    _startCooldown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otp.dispose();
    super.dispose();
  }

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _remainingSeconds = _resendCooldownSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_remainingSeconds <= 1) {
        timer.cancel();
        setState(() => _remainingSeconds = 0);
        return;
      }
      setState(() => _remainingSeconds -= 1);
    });
  }

  Future<void> _verify() async {
    final l10n = AppLocalizations.of(context);
    final code = _otp.text.trim();
    if (code.length != 6) {
      setState(() => _error = l10n.authOtpCodeRequired);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });

    final authApi = AppScope.of(context).authApiService;
    final session = AppScope.authSessionOf(context);

    try {
      final result = await authApi.verifyOtp(email: widget.email, otp: code);
      await session.setTokens(
        access: result.accessToken,
        refresh: result.refreshToken,
        userId: result.user?.id,
        userEmail: result.user?.email,
        userRole: result.user?.role,
      );
      if (!mounted) return;
      context.go(AppRoutePaths.hub);
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = _mapVerifyError(error, l10n));
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = l10n.authGenericError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resend() async {
    if (_busy || _remainingSeconds > 0) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      final result = await AppScope.of(context).authApiService.requestOtp(
            email: widget.email,
          );
      if (!mounted) return;
      _startCooldown();
      _otp.clear();
      setState(() => _info = result.message);
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = _mapRequestError(error, l10n));
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = l10n.authGenericError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _mapVerifyError(AuthApiException error, AppLocalizations l10n) {
    if (error.isNetworkError) return l10n.authNetworkRetry;
    if (error.statusCode == 401) return l10n.authOtpInvalidOrExpired;
    if (error.statusCode == 429) return l10n.authOtpTooManyAttempts;
    return l10n.authGenericError;
  }

  String _mapRequestError(AuthApiException error, AppLocalizations l10n) {
    if (error.isNetworkError) return l10n.authNetworkRetry;
    if (error.statusCode == 429) return l10n.authOtpTooManyAttempts;
    return l10n.authGenericError;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.authOtpCodeTitle),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.authOtpCheckEmail,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.outline,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.authOtpCodeHelp(widget.email),
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            if (_info != null) ...[
              _StatusBanner(
                message: _info!,
                color: theme.colorScheme.primary,
                foregroundColor: theme.colorScheme.onPrimaryContainer,
                backgroundColor: theme.colorScheme.primaryContainer,
              ),
              const SizedBox(height: 16),
            ] else ...[
              _StatusBanner(
                message: l10n.authOtpRequestSuccess,
                color: theme.colorScheme.primary,
                foregroundColor: theme.colorScheme.onPrimaryContainer,
                backgroundColor: theme.colorScheme.primaryContainer,
              ),
              const SizedBox(height: 16),
            ],
            if (_error != null) ...[
              _StatusBanner(
                message: _error!,
                color: theme.colorScheme.error,
                foregroundColor: theme.colorScheme.onErrorContainer,
                backgroundColor: theme.colorScheme.errorContainer,
              ),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _otp,
              enabled: !_busy,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.oneTimeCode],
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
              style: theme.textTheme.headlineSmall?.copyWith(
                letterSpacing: 8,
                fontWeight: FontWeight.w700,
              ),
              decoration: InputDecoration(
                labelText: l10n.authOtpCodeLabel,
                hintText: '123456',
                border: const OutlineInputBorder(),
                counterText: '',
              ),
              maxLength: 6,
              onSubmitted: (_) => _busy ? null : _verify(),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _verify,
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l10n.authOtpVerifyCta),
            ),
            const SizedBox(height: 16),
            Text(
              _remainingSeconds > 0
                  ? l10n.authOtpResendIn(_remainingSeconds)
                  : l10n.authOtpResendReady,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: (_busy || _remainingSeconds > 0) ? null : _resend,
              child: Text(l10n.authOtpResendCta),
            ),
            TextButton(
              onPressed: _busy ? null : () => context.pop(),
              child: Text(l10n.authOtpChangeEmail),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({
    required this.message,
    required this.color,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final String message;
  final Color color;
  final Color foregroundColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: foregroundColor,
                height: 1.4,
              ),
        ),
      ),
    );
  }
}
