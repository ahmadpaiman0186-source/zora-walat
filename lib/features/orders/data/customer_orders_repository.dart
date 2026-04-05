import '../../../core/auth/auth_session.dart';
import '../../../core/auth/unauthorized_exception.dart';
import '../../../services/api_service.dart';
import '../domain/order_center_row.dart';
import '../domain/order_sync_source.dart';
import 'local_order_history_store.dart';

/// Loads merged account + device order history (server is source of truth when available).
class CustomerOrdersRepository {
  CustomerOrdersRepository({
    required ApiService api,
    required LocalOrderHistoryStore local,
    required AuthSession auth,
  })  : _api = api,
        _local = local,
        _auth = auth;

  final ApiService _api;
  final LocalOrderHistoryStore _local;
  final AuthSession _auth;

  Future<OrderCenterLoadResult> loadMerged() async {
    final localRows = _local
        .recentOrders()
        .map(OrderCenterRow.fromLocalCache)
        .where((r) => r.orderId.isNotEmpty)
        .toList();

    if (!_auth.isAuthenticated) {
      _sortByUpdated(localRows);
      return OrderCenterLoadResult(orders: localRows);
    }

    try {
      final raw = await _api.fetchUserOrders();
      final cloudRows = raw
          .map(OrderCenterRow.fromServerPayload)
          .where((r) => r.orderId.isNotEmpty)
          .toList();
      final cloudIds = cloudRows.map((r) => r.orderId).toSet();
      final deviceOnly =
          localRows.where((r) => !cloudIds.contains(r.orderId)).toList();
      final merged = [...cloudRows, ...deviceOnly];
      _sortByUpdated(merged);
      return OrderCenterLoadResult(orders: merged);
    } on UnauthorizedException {
      _sortByUpdated(localRows);
      return OrderCenterLoadResult(
        orders: localRows,
        cloudRefreshFailed: true,
      );
    } catch (_) {
      _sortByUpdated(localRows);
      return OrderCenterLoadResult(
        orders: localRows,
        cloudRefreshFailed: true,
      );
    }
  }

  Future<OrderCenterRow?> fetchAccountOrderDetail(String orderId) async {
    if (!_auth.isAuthenticated) return null;
    final json = await _api.fetchUserOrder(orderId);
    return OrderCenterRow.fromServerPayload(json);
  }

  static void _sortByUpdated(List<OrderCenterRow> list) {
    list.sort((a, b) {
      final da = DateTime.tryParse(a.updatedAtIso) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final db = DateTime.tryParse(b.updatedAtIso) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return db.compareTo(da);
    });
  }

  /// After a successful cloud detail fetch, refresh local cache for offline continuity.
  Future<void> persistDetailSnapshot(OrderCenterRow row) async {
    if (row.syncSource != OrderSyncSource.account) return;
    await _local.upsertOrder(
      orderId: row.orderId,
      trackingStageKey: row.trackingStageKey,
      paymentStateLabel: row.paymentStateLabel,
      fulfillmentStateLabel: row.fulfillmentStateLabel,
      operatorLabel: row.operatorLabel,
      phoneMasked: row.phoneMasked,
      amountLabel: row.amountLabel,
      providerReferenceSuffix: row.providerReferenceSuffix,
    );
  }
}
