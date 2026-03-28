import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/di/app_scope.dart';
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
  final _phoneCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  MobileOperator? _detected;
  MobileOperator? _manual;
  AirtimeOffer? _selected;

  MobileOperator? get _effectiveOperator => _manual ?? _detected;

  @override
  void initState() {
    super.initState();
    _phoneCtrl.addListener(_onPhoneChanged);
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _onPhoneChanged() {
    final n = AfghanPhoneUtils.normalizeNational(_phoneCtrl.text);
    final det = n == null ? null : AfghanPhoneUtils.detectOperator(n);
    if (det != _detected) {
      setState(() {
        _detected = det;
        if (_manual == null) _selected = null;
      });
    }
  }

  void _goCheckout() {
    final l10n = AppLocalizations.of(context);
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

    final national = AfghanPhoneUtils.normalizeNational(_phoneCtrl.text)!;
    final masked = AfghanPhoneUtils.maskForLog(national);

    final order = TelecomOrder(
      line: TelecomServiceLine.airtime,
      operator: op,
      phone: PhoneNumber(_phoneCtrl.text.trim()),
      productId: offer.id,
      productTitle:
          'Airtime ${offer.labelShort} (${NumberFormat.simpleCurrency(name: 'USD').format(offer.finalUsdCents / 100)}) · ${op.displayName}',
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
      },
    );
    context.push(AppRoutePaths.checkout, extra: order);
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
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s-]')),
            ],
            decoration: InputDecoration(
              labelText: l10n.recipientNumber,
              hintText: l10n.telecomPhoneHintAirtime,
              prefixIcon: const Icon(Icons.phone_iphone_rounded),
            ),
            validator: AfghanPhoneUtils.validationError,
          ),
          const SizedBox(height: 16),
          if (_detected != null && _manual == null)
            Chip(
              avatar: Icon(Icons.auto_awesome, size: 18, color: t.colorScheme.primary),
              label: Text(l10n.telecomDetectedOperator(_detected!.displayName)),
            ),
          if (_detected == null && _phoneCtrl.text.trim().isNotEmpty)
            Text(
              l10n.telecomPrefixUnknown,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.secondary,
              ),
            ),
          const SizedBox(height: 12),
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
          Text(l10n.telecomMinuteBundlesTitle, style: t.textTheme.titleMedium),
          const SizedBox(height: 12),
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
            FutureBuilder<List<AirtimeOffer>>(
              key: ValueKey(op.apiKey),
              future: AppScope.of(context)
                  .telecomService
                  .fetchAirtimeDenominations(op),
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final rows = snap.data ?? const <AirtimeOffer>[];
                return LayoutBuilder(
                  builder: (context, c) {
                    final cols = c.maxWidth > 480 ? 3 : 2;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: cols,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: cols == 3 ? 0.95 : 1.05,
                      ),
                      itemCount: rows.length,
                      itemBuilder: (context, i) {
                        final o = rows[i];
                        return AirtimeAmountTile(
                          offer: o,
                          selected: _selected?.id == o.id,
                          onTap: () => setState(() => _selected = o),
                        );
                      },
                    );
                  },
                );
              },
            ),
          const SizedBox(height: 24),
          ZwPrimaryButton(
            label: l10n.reviewPayTitle,
            icon: Icons.lock_outline_rounded,
            onPressed: _goCheckout,
          ),
        ],
      ),
    );
  }
}
