import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/di/app_scope.dart';
import '../../../../core/phone/receiving_country_dial.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/utils/afghan_phone_utils.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../shared/widgets/airtime_amount_tile.dart';
import '../../../../shared/widgets/zw_primary_button.dart';
import '../../domain/airtime_offer.dart';
import '../../domain/mobile_operator.dart';
import '../../domain/pricing_engine.dart';
import '../../domain/phone_number.dart';
import '../../domain/telecom_order.dart';
import '../../domain/telecom_service_line.dart';

class AirtimeTab extends StatefulWidget {
  const AirtimeTab({super.key});

  @override
  State<AirtimeTab> createState() => _AirtimeTabState();
}

class _AirtimeTabState extends State<AirtimeTab> {
  ReceivingCountry _receivingCountry = ReceivingCountry.af;
  final _localPhoneCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  MobileOperator? _detected;
  MobileOperator? _manual;
  AirtimeOffer? _selected;
  /// Bumps [FutureBuilder] when user taps Retry after a catalog error.
  int _airtimeCatalogGeneration = 0;

  MobileOperator? get _effectiveOperator => _manual ?? _detected;

  @override
  void initState() {
    super.initState();
    _localPhoneCtrl.addListener(_onPhoneChanged);
  }

  @override
  void dispose() {
    _localPhoneCtrl.dispose();
    super.dispose();
  }

  /// Input passed to [AfghanPhoneUtils] (local mobile for Afghanistan only).
  String get _rawPhoneForValidation {
    final t = _localPhoneCtrl.text.trim();
    if (t.isEmpty) return '';
    if (_receivingCountry != ReceivingCountry.af) return t;
    return t;
  }

  void _onPhoneChanged() {
    if (_receivingCountry != ReceivingCountry.af) return;
    final n = AfghanPhoneUtils.normalizeNational(_rawPhoneForValidation);
    final newDet = n == null ? null : AfghanPhoneUtils.detectOperator(n);
    setState(() {
      final opChanged = newDet != _detected;
      _detected = newDet;
      if (_manual == null && opChanged) _selected = null;
    });
  }

  void _goCheckout() {
    final l10n = AppLocalizations.of(context);
    if (!_receivingCountry.isPhase1AirtimeSupported) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.phase1AirtimeAfghanistanOnly)),
      );
      return;
    }
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final op = _effectiveOperator;
    if (op == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.telecomSelectOperatorSnack)),
      );
      return;
    }
    final offer = _selected;
    if (offer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.telecomChooseAmountSnack)),
      );
      return;
    }

    final national = AfghanPhoneUtils.normalizeNational(_rawPhoneForValidation)!;
    final masked = AfghanPhoneUtils.maskForLog(national);
    final priceStr = NumberFormat.simpleCurrency(name: 'USD')
        .format(offer.finalUsdCents / 100);

    final order = TelecomOrder(
      line: TelecomServiceLine.airtime,
      operator: op,
      phone: PhoneNumber(_rawPhoneForValidation),
      productId: offer.id,
      productTitle:
          '${l10n.lineAirtime} ${offer.labelShort} ($priceStr) · ${op.displayName}',
      finalUsdCents: offer.finalUsdCents,
      metadata: {
        'service_line': 'airtime',
        'operator': op.apiKey,
        'airtime_offer_id': offer.id,
        'phone_masked': masked,
        'minutes': offer.minutes.toString(),
        'min_margin_after_costs':
            PricingEngine.minimumMarginAfterCosts.toString(),
        'max_landed_cost_usd_cents':
            offer.maxLandedCostUsdCents.toString(),
        'receiving_country': _receivingCountry.iso2,
      },
    );
    context.push(AppRoutePaths.checkout, extra: order);
  }

  bool _canReviewPay(AppLocalizations l10n) {
    if (!_receivingCountry.isPhase1AirtimeSupported) return false;
    if (AfghanPhoneUtils.validationErrorL10n(
          l10n,
          _rawPhoneForValidation,
        ) !=
        null) {
      return false;
    }
    if (_effectiveOperator == null || _selected == null) return false;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final op = _effectiveOperator;

    return Form(
      key: _formKey,
      child: ListView(
        key: const PageStorageKey<String>('airtime_tab'),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
        children: [
          Text(l10n.telecomAirtimeHeadline, style: t.textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            l10n.telecomAirtimeSubtitle,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              l10n.receivingCountryLabel,
              style: t.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<ReceivingCountry>(
            // ignore: deprecated_member_use — controlled state; initialValue only applies once.
            value: _receivingCountry,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              isDense: true,
            ),
            isExpanded: true,
            items: kReceivingCountriesOrdered
                .map(
                  (c) => DropdownMenuItem(
                    value: c,
                    child: Text('${c.displayLabel} (${c.e164Prefix})'),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v == null) return;
              setState(() {
                _receivingCountry = v;
                _localPhoneCtrl.clear();
                _detected = null;
                _manual = null;
                _selected = null;
              });
            },
          ),
          const SizedBox(height: 16),
          if (!_receivingCountry.isPhase1AirtimeSupported) ...[
            Text(
              l10n.phase1AirtimeAfghanistanOnly,
              style: t.textTheme.bodyMedium?.copyWith(
                color: t.colorScheme.error,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
          ] else ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InputDecorator(
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 16,
                    ),
                  ),
                  child: Text(
                    _receivingCountry.e164Prefix,
                    style: t.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                const Text('|', style: TextStyle(fontSize: 22)),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _localPhoneCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')),
                    ],
                    decoration: InputDecoration(
                      labelText: l10n.recipientLocalNumber,
                      hintText: l10n.telecomPhoneHintAirtime,
                      prefixIcon: const Icon(Icons.phone_iphone_rounded),
                    ),
                    validator: (_) => AfghanPhoneUtils.validationErrorL10n(
                      l10n,
                      _rawPhoneForValidation,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              l10n.telecomRecipientAfghanistanDialHint,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 16),
            if (_detected != null && _manual == null)
              Chip(
                avatar: Icon(Icons.auto_awesome, size: 18, color: t.colorScheme.primary),
                label: Text(
                  l10n.telecomDetectedOperator(_detected!.displayName),
                ),
              ),
            if (_detected == null && _localPhoneCtrl.text.trim().isNotEmpty)
              Text(
                l10n.telecomPrefixUnknown,
                style: t.textTheme.bodySmall?.copyWith(
                  color: t.colorScheme.secondary,
                ),
              ),
            const SizedBox(height: 12),
          ],
          if (_receivingCountry.isPhase1AirtimeSupported) ...[
            Text(l10n.operator, style: t.textTheme.titleMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: MobileOperator.values.map((o) {
                final sel = _effectiveOperator == o;
                return ChoiceChip(
                  label: Text(o.displayName),
                  selected: sel,
                  onSelected: (_) {
                    setState(() {
                      _manual = o;
                      _selected = null;
                    });
                  },
                );
              }).toList(),
            ),
            if (_manual != null)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => setState(() {
                    _manual = null;
                    _selected = null;
                  }),
                  child: Text(l10n.telecomUseAutoDetect),
                ),
              ),
            const SizedBox(height: 20),
            if (op == null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                l10n.telecomEnterNumberForAmounts,
                style: t.textTheme.bodyLarge?.copyWith(
                  color: t.colorScheme.outline,
                ),
                textAlign: TextAlign.center,
              ),
            )
          else
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
                          Icons.payments_rounded,
                          color: t.colorScheme.primary,
                          size: 22,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            l10n.telecomMinuteBundlesTitle,
                            style: t.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    FutureBuilder<List<AirtimeOffer>>(
                      key: ValueKey(
                        '${op.apiKey}_$_airtimeCatalogGeneration',
                      ),
                      future: AppScope.of(context)
                          .telecomService
                          .fetchAirtimeDenominations(op),
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 28),
                            child: Column(
                              children: [
                                const CircularProgressIndicator(),
                                const SizedBox(height: 16),
                                Text(
                                  l10n.telecomLoadingAmounts,
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
                                    () => _airtimeCatalogGeneration++,
                                  ),
                                  icon: const Icon(Icons.refresh_rounded),
                                  label: Text(l10n.actionRetry),
                                ),
                              ],
                            ),
                          );
                        }
                        final rows =
                            snap.data ?? const <AirtimeOffer>[];
                        if (rows.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.inventory_2_outlined,
                                  size: 40,
                                  color: t.colorScheme.outline,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  l10n.telecomAirtimeEmpty,
                                  textAlign: TextAlign.center,
                                  style: t.textTheme.bodyLarge?.copyWith(
                                    color: t.colorScheme.outline,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }
                        return LayoutBuilder(
                          builder: (context, c) {
                            final cols = c.maxWidth > 480 ? 3 : 2;
                            return GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate:
                                  SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: cols,
                                mainAxisSpacing: 10,
                                crossAxisSpacing: 10,
                                childAspectRatio:
                                    cols == 3 ? 0.95 : 1.05,
                              ),
                              itemCount: rows.length,
                              itemBuilder: (context, i) {
                                final offer = rows[i];
                                return AirtimeAmountTile(
                                  offer: offer,
                                  selected: _selected?.id == offer.id,
                                  onTap: () => setState(
                                    () => _selected = offer,
                                  ),
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
          ZwPrimaryButton(
            label: l10n.reviewPayTitle,
            icon: Icons.lock_outline_rounded,
            onPressed: _canReviewPay(l10n) ? _goCheckout : null,
          ),
        ],
      ),
    );
  }
}
