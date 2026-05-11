import 'package:intl/intl.dart';

class Fmt {
  Fmt._();

  static final DateFormat _date = DateFormat('MMM d, yyyy');
  static final DateFormat _dateShort = DateFormat('MMM d');
  static final DateFormat _time = DateFormat('h:mm a');
  static final DateFormat _weekday = DateFormat('EEEE');

  static String date(DateTime d) => _date.format(d.toLocal());
  static String dateShort(DateTime d) => _dateShort.format(d.toLocal());
  static String time(DateTime d) => _time.format(d.toLocal());
  static String weekday(DateTime d) => _weekday.format(d.toLocal());

  static String relative(DateTime d) {
    final diff = DateTime.now().difference(d.toLocal());
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return _date.format(d.toLocal());
  }

  static String compactNumber(num value) {
    if (value.abs() >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(value % 1000000 == 0 ? 0 : 1)}M';
    }
    if (value.abs() >= 1000) {
      return '${(value / 1000).toStringAsFixed(value % 1000 == 0 ? 0 : 1)}K';
    }
    return value.toString();
  }

  static String currency(num value, {String symbol = '\u20B9'}) {
    final formatter = NumberFormat.currency(symbol: symbol, decimalDigits: 0);
    return formatter.format(value);
  }

  static String greeting(DateTime now) {
    final h = now.hour;
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }

  static String weekdayWithDate(DateTime d) =>
      '${weekday(d)} � ${dateShort(d)} � ${DateFormat.y().format(d.toLocal())}';
}
