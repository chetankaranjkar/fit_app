import 'dart:typed_data';

import 'package:image/image.dart' as img;

import 'app_config.dart';

/// Builds absolute image URLs from API-relative paths under wwwroot.
class MediaUrls {
  MediaUrls._();

  static String resolve(String? relativeOrAbsolute) {
    if (relativeOrAbsolute == null || relativeOrAbsolute.isEmpty) {
      return '';
    }
    final s = relativeOrAbsolute.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return s;
    }
    final path = s.startsWith('/') ? s : '/$s';
    return '${AppConfig.apiHost}$path';
  }
}

class ImageProcessing {
  ImageProcessing._();

  /// Resize (max edge) and JPEG encode for uploads. Returns original bytes if decode fails.
  static Uint8List resizeAndEncodeJpeg(
    Uint8List bytes, {
    int maxEdge = 1920,
    int quality = 88,
  }) {
    final decoded = img.decodeImage(bytes);
    if (decoded == null) return bytes;
    var work = decoded;
    final w = work.width;
    final h = work.height;
    if (w > maxEdge || h > maxEdge) {
      work = w >= h
          ? img.copyResize(work, width: maxEdge, interpolation: img.Interpolation.linear)
          : img.copyResize(work, height: maxEdge, interpolation: img.Interpolation.linear);
    }
    return Uint8List.fromList(img.encodeJpg(work, quality: quality));
  }

  static Uint8List rotate90(Uint8List bytes) {
    final decoded = img.decodeImage(bytes);
    if (decoded == null) return bytes;
    final rotated = img.copyRotate(decoded, angle: 90);
    return Uint8List.fromList(img.encodeJpg(rotated, quality: 90));
  }
}
