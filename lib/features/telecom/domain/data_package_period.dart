enum DataPackagePeriod {
  daily,
  weekly,
  monthly,
}

extension DataPackagePeriodLabel on DataPackagePeriod {
  String get displayName => switch (this) {
        DataPackagePeriod.daily => 'Daily',
        DataPackagePeriod.weekly => 'Weekly',
        DataPackagePeriod.monthly => 'Monthly',
      };
}
