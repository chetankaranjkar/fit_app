import 'dart:typed_data';

import 'image_cropper_stub.dart' if (dart.library.io) 'image_cropper_io.dart' as impl;

Future<Uint8List?> cropImageBytes(Uint8List bytes, {required bool circle}) =>
    impl.cropImageBytes(bytes, circle: circle);
