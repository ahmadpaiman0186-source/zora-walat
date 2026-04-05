import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// Four-stage linear tracker: payment → prep → send → delivered.
class OrderTrackingTimeline extends StatelessWidget {
  const OrderTrackingTimeline({
    super.key,
    required this.activeIndex,
    required this.highlightStep,
    this.failedAtStep = false,
  });

  /// Highest completed-or-active step index (0–3).
  final int activeIndex;

  /// Step to emphasize as "current" (may equal activeIndex).
  final int highlightStep;

  final bool failedAtStep;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final steps = [
      l10n.timelinePayment,
      l10n.timelinePreparing,
      l10n.timelineSending,
      l10n.timelineDelivered,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.timelineTitle,
          style: t.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < steps.length; i++) ...[
          _TimelineRow(
            label: steps[i],
            state: _rowState(i),
            isLast: i == steps.length - 1,
            t: t,
            danger: failedAtStep && i == highlightStep,
          ),
        ],
      ],
    );
  }

  _TimelineVisualState _rowState(int i) {
    if (failedAtStep && i == highlightStep) {
      return _TimelineVisualState.danger;
    }
    if (i < activeIndex) return _TimelineVisualState.done;
    if (i == activeIndex || i == highlightStep) {
      return _TimelineVisualState.active;
    }
    return _TimelineVisualState.pending;
  }
}

enum _TimelineVisualState { pending, active, done, danger }

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.state,
    required this.isLast,
    required this.t,
    required this.danger,
  });

  final String label;
  final _TimelineVisualState state;
  final bool isLast;
  final ThemeData t;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final primary = t.colorScheme.primary;
    final outline = t.colorScheme.outline;
    Color dotFill;
    Color dotBorder;
    Color lineColor;
    IconData? innerIcon;

    switch (state) {
      case _TimelineVisualState.done:
        dotFill = primary.withValues(alpha: 0.25);
        dotBorder = primary.withValues(alpha: 0.65);
        lineColor = primary.withValues(alpha: 0.4);
        innerIcon = Icons.check_rounded;
      case _TimelineVisualState.active:
        dotFill = primary.withValues(alpha: 0.35);
        dotBorder = primary;
        lineColor = outline.withValues(alpha: 0.25);
        innerIcon = null;
      case _TimelineVisualState.danger:
        dotFill = t.colorScheme.error.withValues(alpha: 0.2);
        dotBorder = t.colorScheme.error.withValues(alpha: 0.8);
        lineColor = outline.withValues(alpha: 0.2);
        innerIcon = Icons.priority_high_rounded;
      case _TimelineVisualState.pending:
        dotFill = t.colorScheme.surfaceContainerHighest;
        dotBorder = outline.withValues(alpha: 0.35);
        lineColor = outline.withValues(alpha: 0.18);
        innerIcon = null;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: dotFill,
                    border: Border.all(color: dotBorder, width: 1.5),
                  ),
                  child: innerIcon != null
                      ? Icon(
                          innerIcon,
                          size: 16,
                          color: danger
                              ? t.colorScheme.error
                              : primary,
                        )
                      : state == _TimelineVisualState.active
                      ? Center(
                          child: Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: danger
                                  ? t.colorScheme.error
                                  : primary,
                            ),
                          ),
                        )
                      : null,
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      decoration: BoxDecoration(
                        color: lineColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
              child: Text(
                label,
                style: t.textTheme.bodyMedium?.copyWith(
                  fontWeight:
                      state == _TimelineVisualState.active ||
                          state == _TimelineVisualState.danger
                      ? FontWeight.w700
                      : FontWeight.w500,
                  color: state == _TimelineVisualState.pending
                      ? outline.withValues(alpha: 0.75)
                      : t.colorScheme.onSurface.withValues(alpha: 0.94),
                  height: 1.3,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
