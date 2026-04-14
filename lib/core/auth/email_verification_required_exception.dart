/// Server returned 403 with `code: auth_verification_required` (money-path gate).
class EmailVerificationRequiredException implements Exception {
  EmailVerificationRequiredException(this.message, {this.errorCode});

  final String message;
  final String? errorCode;

  @override
  String toString() => message;
}
