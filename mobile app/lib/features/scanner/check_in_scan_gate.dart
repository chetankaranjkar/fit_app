/// In-flight + result lock so a second QR detect cannot POST while one
/// attempt is running or an overlay is showing.
class CheckInScanGate {
  bool _busy = false;
  bool _locked = false;

  bool get isBusy => _busy;
  bool get isLocked => _locked;
  bool get canStart => !_busy && !_locked;

  /// Returns false when a scan is already processing or a result is shown.
  bool begin() {
    if (!canStart) return false;
    _busy = true;
    return true;
  }

  void finishLocked() {
    _busy = false;
    _locked = true;
  }

  /// After the member dismisses the result and is allowed to scan again.
  void reset() {
    _busy = false;
    _locked = false;
  }
}
