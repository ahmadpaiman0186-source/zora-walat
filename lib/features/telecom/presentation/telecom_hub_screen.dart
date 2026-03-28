import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';
import 'tabs/airtime_tab.dart';
import 'tabs/data_packages_tab.dart';
import 'tabs/international_placeholder_tab.dart';

class TelecomHubScreen extends StatelessWidget {
  const TelecomHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return DefaultTabController(
      length: 3,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Material(
            color: t.colorScheme.surface,
            child: TabBar(
              dividerColor: Colors.transparent,
              labelStyle: t.textTheme.labelLarge,
              tabs: [
                Tab(text: l10n.tabAirtime),
                Tab(text: l10n.tabDataPackages),
                Tab(text: l10n.tabIntlCalling),
              ],
            ),
          ),
          const Expanded(
            child: TabBarView(
              physics: BouncingScrollPhysics(),
              children: [
                AirtimeTab(),
                DataPackagesTab(),
                InternationalPlaceholderTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
