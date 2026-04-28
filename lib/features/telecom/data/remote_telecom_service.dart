import 'package:http/http.dart' as http;

import '../domain/airtime_offer.dart';
import '../domain/data_package_offer.dart';
import '../domain/mobile_operator.dart';
import 'telecom_catalog_local.dart';
import 'telecom_service.dart';

/// BFF client — airtime face values are Phase-1-locked in [TelecomCatalogLocal] to match the API allow-list.
class RemoteTelecomService extends TelecomService {
  RemoteTelecomService({
    required this.client,
    required this.baseUrl,
  }) : super();

  final http.Client client;
  final String baseUrl;

  @override
  Future<List<AirtimeOffer>> fetchAirtimeDenominations(
    MobileOperator operator,
  ) async {
    await Future<void>.delayed(const Duration(milliseconds: 1));
    return TelecomCatalogLocal.airtimeFor(operator);
  }

  @override
  Future<List<DataPackageOffer>> fetchDataPackages(
    MobileOperator operator,
  ) async {
    return TelecomCatalogLocal.dataFor(operator);
  }
}
