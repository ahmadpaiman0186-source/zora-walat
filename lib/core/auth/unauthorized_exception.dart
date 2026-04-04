/// Session missing, expired, or rejected by the server (after refresh attempt).
class UnauthorizedException implements Exception {
  UnauthorizedException();

  @override
  String toString() => 'UnauthorizedException';
}
