import 'package:flutter/material.dart';

class ZwPrimaryButton extends StatelessWidget {
  const ZwPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final Widget child = icon == null
        ? FilledButton(onPressed: onPressed, child: Text(label))
        : FilledButton.icon(
            onPressed: onPressed,
            icon: Icon(icon, size: 22),
            label: Text(label),
          );
    if (!expand) return child;
    return SizedBox(width: double.infinity, child: child);
  }
}
