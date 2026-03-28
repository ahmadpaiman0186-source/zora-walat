import 'package:flutter/material.dart';

import 'locale_controller.dart';

/// Exposes [LocaleController] below [MaterialApp]. Depends on [locale] so
/// dependents rebuild when the user switches language.
class LocaleScope extends InheritedWidget {
  const LocaleScope({
    super.key,
    required this.locale,
    required this.controller,
    required super.child,
  });

  final Locale locale;
  final LocaleController controller;

  static LocaleController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LocaleScope>();
    assert(scope != null, 'LocaleScope not found');
    return scope!.controller;
  }

  @override
  bool updateShouldNotify(LocaleScope oldWidget) {
    return oldWidget.locale != locale;
  }
}

extension LocaleControllerContext on BuildContext {
  LocaleController get localeController => LocaleScope.of(this);
}
