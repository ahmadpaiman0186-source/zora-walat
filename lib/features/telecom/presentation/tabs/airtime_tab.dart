import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/di/app_scope.dart';
import '../../../../core/phone/receiving_country_dial.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/utils/afghan_phone_utils.dart';
import '../../../../l10n/app_localizations.dart';
import '../../domain/airtime_offer.dart';
import '../../domain/mobile_operator.dart';
import '../../domain/pricing_engine.dart';
import '../../domain/phone_number.dart';
import '../../domain/telecom_order.dart';
import '../../domain/telecom_service_line.dart';

/// Phase 1 airtime — **non-sliver** scroll + fixed-size tap targets (Flutter web safe).
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

    final national =
        AfghanPhoneUtils.normalizeNational(_rawPhoneForValidation);
    if (national == null || national.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.phoneValidationInvalid)),
      );
      return;
    }
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

  Widget _statusPanel(ThemeData t, AppLocalizations l10n) {
    final op = _effectiveOperator;
    final sel = _selected;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: t.colorScheme.primary.withValues(alpha: 0.35),
          width: 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Airtime status',
              style: t.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: t.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Receiving: ${_receivingCountry.displayLabel} (${_receivingCountry.iso2})',
              style: t.textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Text(
              op == null
                  ? 'Operator: — ${l10n.telecomSelectOperatorSnack}'
                  : 'Operator: ${op.displayName}',
              style: t.textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Text(
              sel == null
                  ? 'Amount: — ${l10n.telecomChooseAmountSnack}'
                  : 'Amount: ${sel.labelShort}',
              style: t.textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Text(
              'Catalog load key: $_airtimeCatalogGeneration',
              style: t.textTheme.labelSmall?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _operatorPickWrap(ThemeData t) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in MobileOperator.values)
          _plainTapChip(
            label: o.displayName,
            selected: _effectiveOperator == o,
            minWidth: 108,
            minHeight: 44,
            onTap: () => setState(() {
              _manual = o;
              _selected = null;
            }),
            t: t,
          ),
      ],
    );
  }

  Widget _plainTapChip({
    required String label,
    required bool selected,
    required double minWidth,
    required double minHeight,
    required VoidCallback onTap,
    required ThemeData t,
  }) {
    final cs = t.colorScheme;
    return SizedBox(
      height: minHeight,
      width: minWidth,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? cs.primary : cs.outline.withValues(alpha: 0.45),
              width: selected ? 2 : 1,
            ),
            color: selected
                ? cs.primary.withValues(alpha: 0.18)
                : cs.surfaceContainerHighest,
          ),
          child: Center(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: t.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _amountButtonsWrap(
    ThemeData t,
    AppLocalizations l10n,
    List<AirtimeOffer> items,
  ) {
    final cs = t.colorScheme;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final offer in items)
          SizedBox(
            width: 104,
            height: 48,
            child: GestureDetector(
              onTap: () => setState(() => _selected = offer),
              behavior: HitTestBehavior.opaque,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _selected?.id == offer.id
                        ? cs.primary
                        : cs.outline.withValues(alpha: 0.4),
                    width: _selected?.id == offer.id ? 2 : 1,
                  ),
                  color: _selected?.id == offer.id
                      ? cs.primary.withValues(alpha: 0.2)
                      : cs.surfaceContainerHighest,
                ),
                child: Center(
                  child: Text(
                    offer.labelShort,
                    style: t.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _bigInstructionCard(ThemeData t, AppLocalizations l10n) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: t.colorScheme.outline.withValues(alpha: 0.35),
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.touch_app_rounded,
              size: 44,
              color: t.colorScheme.primary.withValues(alpha: 0.9),
            ),
            const SizedBox(height: 14),
            Text(
              l10n.telecomEnterNumberForAmounts,
              style: t.textTheme.bodyLarge?.copyWith(
                color: t.colorScheme.onSurface,
                height: 1.35,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              l10n.telecomSelectOperatorSnack,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _reviewPayStrip(ThemeData t, AppLocalizations l10n) {
    final ok = _canReviewPay(l10n);
    final cs = t.colorScheme;
    final fill = ok ? cs.primary : cs.surfaceContainerHighest;
    final fg = ok ? cs.onPrimary : cs.onSurface.withValues(alpha: 0.38);
    final border = ok ? cs.primary : cs.outline.withValues(alpha: 0.35);
    final box = DecoratedBox(
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border, width: ok ? 1 : 1),
      ),
      child: SizedBox(
        height: 52,
        width: double.infinity,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_outline_rounded, size: 22, color: fg),
            const SizedBox(width: 10),
            Text(
              l10n.reviewPayTitle,
              style: t.textTheme.labelLarge?.copyWith(
                color: fg,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
    if (!ok) {
      return Opacity(opacity: 0.85, child: box);
    }
    return GestureDetector(
      onTap: _goCheckout,
      behavior: HitTestBehavior.opaque,
      child: box,
    );
  }

  Widget _bigEmptyCard(ThemeData t, AppLocalizations l10n) {
    return SizedBox(
      width: double.infinity,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: t.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: t.colorScheme.error.withValues(alpha: 0.35),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.inventory_2_outlined,
                size: 48,
                color: t.colorScheme.outline,
              ),
              const SizedBox(height: 14),
              Text(
                l10n.telecomAirtimeEmpty,
                textAlign: TextAlign.center,
                style: t.textTheme.titleMedium?.copyWith(
                  color: t.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final op = _effectiveOperator;

    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        key: const PageStorageKey<String>('airtime_tab_scroll'),
        // Avoid PrimaryScrollController conflicts with nested hub scroll (web layout collapse).
        primary: false,
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _statusPanel(t, l10n),
            const SizedBox(height: 18),
            Text(l10n.telecomAirtimeHeadline, style: t.textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(
              l10n.telecomAirtimeSubtitle,
              style: t.textTheme.bodyMedium?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              l10n.receivingCountryLabel,
              style: t.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<ReceivingCountry>(
              // ignore: deprecated_member_use — controlled [value] for form state.
              value: _receivingCountry,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                isDense: true,
              ),
              isExpanded: true,
              items: [
                for (final c in kReceivingCountriesOrdered)
                  DropdownMenuItem(
                    value: c,
                    child: Text('${c.displayLabel} (${c.e164Prefix})'),
                  ),
              ],
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
              SizedBox(
                height: 52,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    isDense: true,
                    labelText: 'Dial prefix',
                  ),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      _receivingCountry.e164Prefix,
                      style: t.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _localPhoneCtrl,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')),
                ],
                decoration: InputDecoration(
                  labelText: l10n.recipientLocalNumber,
                  hintText: l10n.telecomPhoneHintAirtime,
                  prefixIcon: const Icon(Icons.phone_iphone_rounded),
                  border: const OutlineInputBorder(),
                ),
                validator: (_) => AfghanPhoneUtils.validationErrorL10n(
                  l10n,
                  _rawPhoneForValidation,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.telecomRecipientAfghanistanDialHint,
                style: t.textTheme.bodySmall?.copyWith(
                  color: t.colorScheme.outline,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 12),
              Builder(
                builder: (context) {
                  final detected = _detected;
                  if (_manual != null || detected == null) {
                    return const SizedBox(height: 8);
                  }
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        Icon(Icons.auto_awesome,
                            size: 20, color: t.colorScheme.primary),
                        Text(
                          l10n.telecomDetectedOperator(detected.displayName),
                          style: t.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  );
                },
              ),
              if (_detected == null &&
                  _localPhoneCtrl.text.trim().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    l10n.telecomPrefixUnknown,
                    style: t.textTheme.bodySmall?.copyWith(
                      color: t.colorScheme.secondary,
                    ),
                  ),
                ),
            ],
            if (_receivingCountry.isPhase1AirtimeSupported) ...[
              const SizedBox(height: 8),
              Text(l10n.operator, style: t.textTheme.titleMedium),
              const SizedBox(height: 8),
              _operatorPickWrap(t),
              if (_manual != null)
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: () => setState(() {
                      _manual = null;
                      _selected = null;
                    }),
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 10,
                        horizontal: 8,
                      ),
                      child: Text(
                        l10n.telecomUseAutoDetect,
                        style: t.textTheme.labelLarge?.copyWith(
                          color: t.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                          decorationColor: t.colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              Text(
                l10n.telecomMinuteBundlesTitle,
                style: t.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              if (op == null)
                _bigInstructionCard(t, l10n)
              else
                FutureBuilder<List<AirtimeOffer>>(
                  key: ValueKey('${op.apiKey}_$_airtimeCatalogGeneration'),
                  future: AppScope.of(context)
                      .telecomService
                      .fetchAirtimeDenominations(op),
                  builder: (context, snap) {
                    if (snap.connectionState != ConnectionState.done) {
                      return const SizedBox(
                        height: 120,
                        child: Center(
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }
                    if (snap.hasError) {
                      return SizedBox(
                        height: 160,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.cloud_off_rounded,
                                size: 40, color: t.colorScheme.secondary),
                            const SizedBox(height: 12),
                            Text(
                              l10n.telecomCatalogLoadError,
                              textAlign: TextAlign.center,
                              style: t.textTheme.bodyMedium?.copyWith(
                                color: t.colorScheme.outline,
                              ),
                            ),
                            const SizedBox(height: 12),
                            GestureDetector(
                              onTap: () => setState(
                                () => _airtimeCatalogGeneration++,
                              ),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 8,
                                  horizontal: 12,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.refresh_rounded,
                                      size: 20,
                                      color: t.colorScheme.primary,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      l10n.actionRetry,
                                      style: t.textTheme.labelLarge?.copyWith(
                                        color: t.colorScheme.primary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                    final items = snap.data;
                    if (items == null || items.isEmpty) {
                      return _bigEmptyCard(t, l10n);
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: _amountButtonsWrap(t, l10n, items),
                    );
                  },
                ),
              const SizedBox(height: 24),
            ],
            _reviewPayStrip(t, l10n),
          ],
        ),
      ),
    );
  }
}
