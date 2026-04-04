import 'dart:convert';

import 'package:http/http.dart' as http;

import '../domain/airtime_offer.dart';
import '../domain/data_package_offer.dart';
import '../domain/mobile_operator.dart';
import 'telecom_catalog_local.dart';
import 'telecom_service.dart';

const String _kBffApiKey = String.fromEnvironment(
  'BFF_API_KEY',
  defaultValue: '',
);

/// Loads airtime SKUs from the BFF (`GET /catalog/airtime`); data stays local until your API exposes bundles.
class RemoteTelecomService extends TelecomService {
  RemoteTelecomService({
    required this.client,
    required this.baseUrl,
  }) : super();

  final http.Client client;
  final String baseUrl;

  Map<String, String> get _headers => {
        if (_kBffApiKey.isNotEmpty) 'X-Api-Key': _kBffApiKey,
      };

  @override
  Future<List<AirtimeOffer>> fetchAirtimeDenominations(
    MobileOperator operator,
  ) async {
    final uri = Uri.parse('$baseUrl/catalog/airtime').replace(
      queryParameters: {'operator': operator.apiKey},
    );
    final res = await client.get(uri, headers: _headers);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(
        'Catalog API ${res.statusCode}: ${res.body}',
      );
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    final list = map['items'] as List<dynamic>? ?? const [];
    return list
        .map(
          (e) => AirtimeOffer.fromCatalogJson(
            Map<String, dynamic>.from(e as Map),
            operator,
          ),
        )
        .toList();
  }

  @override
  Future<List<DataPackageOffer>> fetchDataPackages(
    MobileOperator operator,
  ) async {
    return TelecomCatalogLocal.dataFor(operator);
  }
}
