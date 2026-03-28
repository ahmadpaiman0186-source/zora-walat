import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Zora-Walat visual language: deep slate, emerald accent, warm gold highlights.
abstract final class AppTheme {
  static const Color _bg = Color(0xFF0F1419);
  static const Color _surface = Color(0xFF1A222C);
  static const Color _surfaceVariant = Color(0xFF242E3A);
  static const Color _primary = Color(0xFF10B981);
  static const Color _secondary = Color(0xFFD4A853);
  static const Color _onMuted = Color(0xFF94A3B8);

  /// Dari (`fa`) and Pashto (`ps`) use [Noto Sans Arabic] for reliable RTL shaping.
  static bool _useArabicScript(Locale? locale) {
    final c = locale?.languageCode;
    return c == 'fa' || c == 'ps';
  }

  static ThemeData dark({Locale? locale}) {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        surface: _surface,
        onSurface: Colors.white,
        primary: _primary,
        onPrimary: Colors.black,
        secondary: _secondary,
        onSecondary: Colors.black,
        surfaceContainerHighest: _surfaceVariant,
        outline: _onMuted.withValues(alpha: 0.35),
      ),
      scaffoldBackgroundColor: _bg,
    );

    final textTheme = _useArabicScript(locale)
        ? GoogleFonts.notoSansArabicTextTheme(base.textTheme).copyWith(
            headlineMedium: GoogleFonts.notoSansArabic(
              textStyle: base.textTheme.headlineMedium,
              fontWeight: FontWeight.w700,
            ),
            headlineSmall: GoogleFonts.notoSansArabic(
              textStyle: base.textTheme.headlineSmall,
              fontWeight: FontWeight.w700,
            ),
            titleLarge: GoogleFonts.notoSansArabic(
              textStyle: base.textTheme.titleLarge,
              fontWeight: FontWeight.w700,
            ),
            titleMedium: GoogleFonts.notoSansArabic(
              textStyle: base.textTheme.titleMedium,
              fontWeight: FontWeight.w600,
            ),
            bodyLarge: GoogleFonts.notoSansArabic(textStyle: base.textTheme.bodyLarge),
            bodyMedium: GoogleFonts.notoSansArabic(textStyle: base.textTheme.bodyMedium),
            labelLarge: GoogleFonts.notoSansArabic(
              textStyle: base.textTheme.labelLarge,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.2,
            ),
          )
        : GoogleFonts.dmSansTextTheme(base.textTheme).copyWith(
            headlineMedium: GoogleFonts.sora(
              textStyle: base.textTheme.headlineMedium,
              fontWeight: FontWeight.w600,
            ),
            headlineSmall: GoogleFonts.sora(
              textStyle: base.textTheme.headlineSmall,
              fontWeight: FontWeight.w600,
            ),
            titleLarge: GoogleFonts.sora(
              textStyle: base.textTheme.titleLarge,
              fontWeight: FontWeight.w600,
            ),
            titleMedium: GoogleFonts.dmSans(
              textStyle: base.textTheme.titleMedium,
              fontWeight: FontWeight.w600,
            ),
            bodyLarge: GoogleFonts.dmSans(textStyle: base.textTheme.bodyLarge),
            bodyMedium: GoogleFonts.dmSans(textStyle: base.textTheme.bodyMedium),
            labelLarge: GoogleFonts.dmSans(
              textStyle: base.textTheme.labelLarge,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: _bg,
        foregroundColor: Colors.white,
        titleTextStyle: textTheme.titleLarge?.copyWith(color: Colors.white),
      ),
      cardTheme: CardThemeData(
        color: _surface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        hintStyle: TextStyle(color: _onMuted.withValues(alpha: 0.8)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: _surface,
        indicatorColor: _primary.withValues(alpha: 0.2),
        labelTextStyle: WidgetStatePropertyAll(
          textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
