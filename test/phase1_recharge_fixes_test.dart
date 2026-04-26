import 'package:flutter_test/flutter_test.dart';
import 'package:zora_walat/core/phone/receiving_country_dial.dart';
import 'package:zora_walat/features/telecom/data/telecom_catalog_local.dart';
import 'package:zora_walat/features/telecom/domain/mobile_operator.dart';

void main() {
  test('Afghanistan receiving country uses +93', () {
    expect(ReceivingCountry.af.e164Prefix, '+93');
    expect(ReceivingCountry.af.dialDigits, '93');
  });

  test('UAE receiving country uses +971 (not default for AF)', () {
    expect(ReceivingCountry.ae.e164Prefix, '+971');
  });

  test('Phase 1 airtime catalog is exact USD ladder', () {
    final offers = TelecomCatalogLocal.airtimeFor(MobileOperator.roshan);
    final dollars = offers.map((o) => o.retailUsdCents ~/ 100).toList();
    expect(
      dollars,
      [2, 3, 5, 7, 9, 11, 13, 15, 20, 25],
    );
    expect(dollars.contains(10), false);
    expect(dollars.contains(30), false);
    expect(dollars.contains(50), false);
  });
}
