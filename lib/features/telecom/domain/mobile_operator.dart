import 'package:flutter/material.dart';

/// Afghanistan operators supported for airtime and data catalog.
enum MobileOperator {
  roshan('Roshan', Color(0xFFE11D48)),
  mtn('MTN', Color(0xFFFACC15)),
  etisalat('Etisalat', Color(0xFFF59E0B)),
  afghanWireless('Afghan Wireless', Color(0xFF2563EB));

  const MobileOperator(this.displayName, this.brandColor);

  final String displayName;
  final Color brandColor;

  String get apiKey => name;
}
