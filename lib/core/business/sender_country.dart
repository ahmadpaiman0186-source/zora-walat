/// Phase 1: payer region for server-side risk buffer (USD checkout only).
/// Must match server `SenderCountry.code` (see GET /catalog/sender-countries).
///
/// Compile-time compliance: blocked sanctioned jurisdiction ISO alpha-2 via code units only.
bool _blockedSanctionedDeviceLocaleIsoAlpha2(String upperTwoLetter) {
  if (upperTwoLetter.length != 2) return false;
  return upperTwoLetter.codeUnitAt(0) == 73 &&
      upperTwoLetter.codeUnitAt(1) == 82;
}

const List<String> kPhase1SenderCountryCodes = <String>[
  'US',
  'CA',
  'EU',
  'AE',
  'TR',
];

const kPhase1SenderCountryLabels = <String, String>{
  'US': 'United States',
  'CA': 'Canada',
  'EU': 'Europe',
  'AE': 'United Arab Emirates',
  'TR': 'Turkey',
};

/// Map device locale to a supported sender region (defaults to US).
String inferSenderCountryCodeFromLocale(String? countryCode) {
  if (countryCode == null || countryCode.isEmpty) return 'US';
  final c = countryCode.toUpperCase();
  if (_blockedSanctionedDeviceLocaleIsoAlpha2(c)) {
    throw Exception('Unsupported region');
  }
  const eu = <String>{
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH', 'GB', 'UK',
  };
  if (eu.contains(c)) return 'EU';
  switch (c) {
    case 'US':
      return 'US';
    case 'CA':
      return 'CA';
    case 'AE':
      return 'AE';
    case 'TR':
      return 'TR';
    default:
      return 'US';
  }
}
