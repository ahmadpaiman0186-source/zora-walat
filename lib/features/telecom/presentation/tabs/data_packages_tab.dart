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
import '../data_package_l10n.dart';
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
  int _dataCatalogGeneration = 0;

  @override
  void initState() {
    super.initState();
    _phoneCtrl.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _goCheckout(DataPackageOffer offer, AppLocalizations l10n) {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final national = AfghanPhoneUtils.normalizeNational(_phoneCtrl.text)!;
    final masked = AfghanPhoneUtils.maskForLog(national);

    final order = TelecomOrder(
      line: TelecomServiceLine.data,
      operator: offer.operator,
      phone: PhoneNumber(_phoneCtrl.text.trim()),
      productId: offer.id,
      productTitle:
          '${offer.localizedDataLabel(l10n)} · ${offer.localizedValidity(l10n)} · ${offer.operator.displayName}',
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

  bool _canReviewPay(AppLocalizations l10n) {
    if (AfghanPhoneUtils.validationErrorL10n(l10n, _phoneCtrl.text) != null) {
      return false;
    }
    return _selected != null;
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
            validator: (v) =>
                AfghanPhoneUtils.validationErrorL10n(l10n, v),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.telecomRecipientAfghanistanDialHint,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline,
              height: 1.35,
            ),
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
          const SizedBox(height: 20),
          Card(
            margin: EdgeInsets.zero,
            color: t.colorScheme.surfaceContainerHighest,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: t.colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.dataset_linked_rounded,
                        color: t.colorScheme.primary,
                        size: 22,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          l10n.telecomDataPackagesSectionTitle,
                          style: t.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  FutureBuilder<List<DataPackageOffer>>(
                    key: ValueKey(
                      '${_operator.apiKey}_$_dataCatalogGeneration',
                    ),
                    future: AppScope.of(context)
                        .telecomService
                        .fetchDataPackages(_operator),
                    builder: (context, snap) {
                      if (snap.connectionState ==
                          ConnectionState.waiting) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 28),
                          child: Column(
                            children: [
                              const CircularProgressIndicator(),
                              const SizedBox(height: 16),
                              Text(
                                l10n.telecomDataLoadingPackages,
                                style: t.textTheme.bodyMedium?.copyWith(
                                  color: t.colorScheme.outline,
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      if (snap.hasError) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Column(
                            children: [
                              Icon(
                                Icons.cloud_off_rounded,
                                size: 40,
                                color: t.colorScheme.secondary,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                l10n.telecomCatalogLoadError,
                                textAlign: TextAlign.center,
                                style: t.textTheme.bodyMedium?.copyWith(
                                  color: t.colorScheme.outline,
                                  height: 1.35,
                                ),
                              ),
                              const SizedBox(height: 16),
                              FilledButton.tonalIcon(
                                onPressed: () => setState(
                                  () => _dataCatalogGeneration++,
                                ),
                                icon: const Icon(Icons.refresh_rounded),
                                label: Text(l10n.actionRetry),
                              ),
                            ],
                          ),
                        );
                      }
                      final all =
                          snap.data ?? const <DataPackageOffer>[];
                      if (all.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Column(
                            children: [
                              Icon(
                                Icons.inventory_2_outlined,
                                size: 40,
                                color: t.colorScheme.outline,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                l10n.telecomNoDataPackages,
                                textAlign: TextAlign.center,
                                style: t.textTheme.bodyLarge?.copyWith(
                                  color: t.colorScheme.outline,
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      final sections =
                          <DataPackagePeriod, List<DataPackageOffer>>{};
                      for (final p in DataPackagePeriod.values) {
                        sections[p] = all
                            .where((e) => e.period == p)
                            .toList(growable: false);
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
                                    onTap: () => setState(
                                      () => _selected = offer,
                                    ),
                                  ),
                                );
                              }),
                            ],
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          ZwPrimaryButton(
            label: l10n.reviewPayTitle,
            icon: Icons.lock_outline_rounded,
            onPressed: _canReviewPay(l10n)
                ? () => _goCheckout(_selected!, l10n)
                : null,
          ),
        ],
      ),
    );
  }
}
