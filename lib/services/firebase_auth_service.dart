import 'package:firebase_auth/firebase_auth.dart';

/// Thrown when Firebase Auth fails with a user-safe [message].
class FirebaseAuthServiceException implements Exception {
  FirebaseAuthServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// MVP Firebase email/password wrapper. Does not replace JWT [AuthSession];
/// use [syncBackendSession…] helpers after success when API access is needed.
class FirebaseAuthService {
  FirebaseAuthService([FirebaseAuth? auth]) : _auth = auth ?? FirebaseAuth.instance;

  final FirebaseAuth _auth;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  User? getCurrentUser() => _auth.currentUser;

  Future<UserCredential> signUpWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw FirebaseAuthServiceException(_mapFirebaseAuthCode(e.code));
    }
  }

  Future<UserCredential> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw FirebaseAuthServiceException(_mapFirebaseAuthCode(e.code));
    }
  }

  Future<void> signOut() async {
    try {
      await _auth.signOut();
    } on FirebaseAuthException catch (e) {
      throw FirebaseAuthServiceException(_mapFirebaseAuthCode(e.code));
    }
  }

  static String _mapFirebaseAuthCode(String code) {
    switch (code) {
      case 'invalid-email':
        return 'That email address doesn’t look valid.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Incorrect email or password.';
      case 'email-already-in-use':
        return 'This email is already registered. Try signing in.';
      case 'weak-password':
        return 'Choose a stronger password (at least 10 characters).';
      case 'network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'too-many-requests':
        return 'Too many attempts. Wait a few minutes and try again.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'operation-not-allowed':
        return 'Email/password sign-in is not enabled for this project.';
      default:
        return 'We couldn’t complete sign-in. Please try again.';
    }
  }
}
