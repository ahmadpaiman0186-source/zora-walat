import 'package:flutter/foundation.dart' show debugPrint, kDebugMode;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../l10n/app_localizations.dart';

/// Email/password sign-in and register against `/auth/login` and `/auth/register`.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _tab.addListener(() {
      if (_tab.indexIsChanging) return;
      setState(() {
        _error = null;
      });
    });
  }

  @override
  void dispose() {
    _tab.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit(bool register) async {
    final l10n = AppLocalizations.of(context);
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = l10n.authFillAllFields);
      return;
    }
    if (register && password.length < 10) {
      setState(() => _error = l10n.authRegisterPasswordHint);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    final authApi = AppScope.of(context).authApiService;
    final session = AppScope.authSessionOf(context);

    try {
      final pair = register
          ? await authApi.register(email: email, password: password)
          : await authApi.login(email: email, password: password);
      await session.setTokens(
        access: pair.accessToken,
        refresh: pair.refreshToken,
      );
      if (!mounted) return;
      context.pop();
    } catch (e, st) {
      if (!mounted) return;
      if (kDebugMode) {
        debugPrint('auth request failed: $e');
        debugPrint('$st');
      }
      final message = e is StateError
          ? e.message
          : (kDebugMode ? e.toString() : l10n.authGenericError);
      setState(() => _error = message);
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
        title: Text(l10n.authAccountTileTitle),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: l10n.authSignInCta),
            Tab(text: l10n.authRegisterTitle),
          ],
        ),
      ),
      body: Padding(
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
                helperText: _tab.index == 1 ? l10n.authRegisterPasswordHint : null,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () => _submit(_tab.index == 1),
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      _tab.index == 1
                          ? l10n.authRegisterCta
                          : l10n.authSignInCta,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
