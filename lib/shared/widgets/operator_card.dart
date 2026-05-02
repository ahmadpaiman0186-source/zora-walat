import 'package:flutter/material.dart';

import '../../features/telecom/domain/mobile_operator.dart';

/// Plain tap surface — **no InkWell / MouseRegion / Tooltip**.
class OperatorCard extends StatelessWidget {
  const OperatorCard({
    super.key,
    required this.operator,
    required this.onTap,
  });

  final MobileOperator operator;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final name = operator.displayName;
    final initial = name.isEmpty ? '?' : name.substring(0, 1);

    return Semantics(
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 88),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                colors: [
                  operator.brandColor.withValues(alpha: 0.25),
                  operator.brandColor.withValues(alpha: 0.08),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(
                color: operator.brandColor.withValues(alpha: 0.45),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor:
                        operator.brandColor.withValues(alpha: 0.35),
                    child: Text(
                      initial,
                      style: t.textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          name,
                          style: t.textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Airtime & data',
                          style: t.textTheme.bodySmall?.copyWith(
                            color: t.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      color: t.colorScheme.outline),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
