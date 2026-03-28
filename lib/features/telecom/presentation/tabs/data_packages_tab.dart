import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/app_scope.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/utils/afghan_phone_utils.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../shared/widgets/data_package_tile.dart';
import '../../../../shared/widgets/zw_primary_button.dart';
import '../../domain/data_package_offer.dart';
import '../../domain/data_package_period.dart';
import '../../domain/mobile_operator.dart';
import '../../domain/phone_number.dart';
import '../../domain/telecom_order.dart';
import '../../domain/telecom_service_line.dart';

class DataPackagesTab extends StatefulWidget {
  const DataPackagesTab({super.key});

  @override
  State<DataPackagesTab> createState() => _DataPackagesTabState();
}

class _DataPackagesTabState extends State<DataPackagesTab> {
  final _phoneCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  MobileOperator _operator = MobileOperator.roshan;
  DataPackageOffer? _selected;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _goCheckout(DataPackageOffer offer) {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final national = AfghanPhoneUtils.normalizeNational(_phoneCtrl.text)!;
    final masked = AfghanPhoneUtils.maskForLog(national);

    final order = TelecomOrder(
      line: TelecomServiceLine.data,
      operator: offer.operator,
      phone: PhoneNumber(_phoneCtrl.text.trim()),
      productId: offer.id,
      productTitle:
          '${offer.dataLabel} · ${offer.validityLabel} · ${offer.operator.displayName}',
      finalUsdCents: offer.finalUsdCents,
      metadata: {
        'service_line': 'data',
        'operator': offer.operator.apiKey,
        'data_package_id': offer.id,
        'phone_submitted': _phoneCtrl.text.trim(),
        'phone_masked': masked,
        'validity_days': offer.validityDays.toString(),
        'data_gb': offer.dataGb.toString(),
        'margin_tier': offer.tier.name,
      },
    );
    context.push(AppRoutePaths.checkout, extra: order);
  }

  String _periodName(DataPackagePeriod p, AppLocalizations l10n) {
    return switch (p) {
      DataPackagePeriod.daily => l10n.periodDaily,
      DataPackagePeriod.weekly => l10n.periodWeekly,
      DataPackagePeriod.monthly => l10n.periodMonthly,
    };
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Form(
      key: _formKey,
      child: ListView(
        key: const PageStorageKey<String>('data_tab'),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
        children: [
          Text(l10n.telecomDataHeadline, style: t.textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            l10n.telecomDataSubtitle,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')),
            ],
            decoration: InputDecoration(
              labelText: l10n.recipientNumber,
              hintText: l10n.telecomPhoneHintData,
              prefixIcon: const Icon(Icons.phone_android_rounded),
            ),
            validator: AfghanPhoneUtils.validationError,
          ),
          const SizedBox(height: 20),
          Text(l10n.operator, style: t.textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: MobileOperator.values.map((o) {
              return ChoiceChip(
                label: Text(o.displayName),
                selected: _operator == o,
                onSelected: (_) {
                  setState(() {
                    _operator = o;
                    _selected = null;
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          FutureBuilder<List<DataPackageOffer>>(
            key: ValueKey(_operator.apiKey),
            future: AppScope.of(context)
                .telecomService
                .fetchDataPackages(_operator),
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final all = snap.data ?? const <DataPackageOffer>[];
              final sections = <DataPackagePeriod, List<DataPackageOffer>>{};
              for (final p in DataPackagePeriod.values) {
                sections[p] =
                    all.where((e) => e.period == p).toList(growable: false);
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final p in DataPackagePeriod.values)
                    if ((sections[p] ?? const []).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        _periodName(p, l10n),
                        style: t.textTheme.titleMedium?.copyWith(
                          color: t.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...sections[p]!.map((offer) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: DataPackageTile(
                            offer: offer,
                            selected: _selected?.id == offer.id,
                            onTap: () =>
                                setState(() => _selected = offer),
                          ),
                        );
                      }),
                    ],
                ],
              );
            },
          ),
          const SizedBox(height: 8),
          ZwPrimaryButton(
            label: l10n.reviewPayTitle,
            icon: Icons.lock_outline_rounded,
            onPressed: _selected == null
                ? null
                : () => _goCheckout(_selected!),
          ),
        ],
      ),
    );
  }
}
