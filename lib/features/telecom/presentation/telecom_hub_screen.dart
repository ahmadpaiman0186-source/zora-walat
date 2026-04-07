import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';
import 'tabs/airtime_tab.dart';

/// Phase 1: Afghanistan mobile top-up (USD) only. Data / calling tabs deferred.
class TelecomHubScreen extends StatelessWidget {
  const TelecomHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
          child: Text(
            l10n.tabAirtime,
            style: t.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const Expanded(
          child: AirtimeTab(),
        ),
      ],
    );
  }
}
