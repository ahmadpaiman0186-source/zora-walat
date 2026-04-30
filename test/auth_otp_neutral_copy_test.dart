import 'package:flutter_test/flutter_test.dart';
import 'package:zora_walat/l10n/app_localizations_en.dart';

/// Auth OTP English copy must stay neutral (anti-enumeration–aligned UX).
void main() {
  final l10n = AppLocalizationsEn();

  final otpUserFacing = <String>[
    l10n.authOtpEmailIntro,
    l10n.authOtpContinueCta,
    l10n.authOtpSendingCode,
    l10n.authOtpCheckEmail,
    l10n.authOtpRequestSuccess,
    l10n.authOtpSecurityNote,
    l10n.authOtpResendReady,
    l10n.authOtpResendCta,
    l10n.authOtpCodeHelp('user@example.com'),
    l10n.authOtpResendIn(30),
    l10n.authOtpCheckEmailOrRetry(30),
  ];

  test('English OTP strings avoid definitive delivery claims', () {
    const forbiddenSubstrings = <String>[
      'OTP sent',
      'Code sent',
      'Email sent successfully',
      'has been sent',
      'verification code has been sent',
    ];
    for (final text in otpUserFacing) {
      final lower = text.toLowerCase();
      for (final bad in forbiddenSubstrings) {
        expect(
          lower,
          isNot(contains(bad.toLowerCase())),
          reason: 'Unexpected phrase in: $text',
        );
      }
    }
  });
}
