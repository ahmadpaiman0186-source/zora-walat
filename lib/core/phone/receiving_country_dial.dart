/// Receiving (recipient) country for telecom top-up — **not** the Stripe payer / sender country.
/// Phase 1 airtime checkout only supports Afghan mobile numbers on the server; other entries are
/// for correct UI prefix only.
enum ReceivingCountry {
  af,
  us,
  ca,
  gb,
  ae,
  tr,
}

extension ReceivingCountryDial on ReceivingCountry {
  /// ISO-3166 alpha-2 (uppercase) for display.
  String get iso2 {
    switch (this) {
      case ReceivingCountry.af:
        return 'AF';
      case ReceivingCountry.us:
        return 'US';
      case ReceivingCountry.ca:
        return 'CA';
      case ReceivingCountry.gb:
        return 'GB';
      case ReceivingCountry.ae:
        return 'AE';
      case ReceivingCountry.tr:
        return 'TR';
    }
  }

  /// E.164 dial code without the leading `+` in the value (e.g. `93`, `1`, `971`).
  String get dialDigits {
    switch (this) {
      case ReceivingCountry.af:
        return '93';
      case ReceivingCountry.us:
      case ReceivingCountry.ca:
        return '1';
      case ReceivingCountry.gb:
        return '44';
      case ReceivingCountry.ae:
        return '971';
      case ReceivingCountry.tr:
        return '90';
    }
  }

  String get e164Prefix => '+$dialDigits';

  String get displayLabel {
    switch (this) {
      case ReceivingCountry.af:
        return 'Afghanistan';
      case ReceivingCountry.us:
        return 'United States';
      case ReceivingCountry.ca:
        return 'Canada';
      case ReceivingCountry.gb:
        return 'United Kingdom';
      case ReceivingCountry.ae:
        return 'United Arab Emirates';
      case ReceivingCountry.tr:
        return 'Türkiye';
    }
  }

  /// Whether server-side Phase 1 airtime (Afghan operators) can proceed.
  bool get isPhase1AirtimeSupported => this == ReceivingCountry.af;
}

/// Ordered list for dropdowns (AF first — primary Phase 1 path).
const kReceivingCountriesOrdered = <ReceivingCountry>[
  ReceivingCountry.af,
  ReceivingCountry.us,
  ReceivingCountry.ca,
  ReceivingCountry.gb,
  ReceivingCountry.ae,
  ReceivingCountry.tr,
];
