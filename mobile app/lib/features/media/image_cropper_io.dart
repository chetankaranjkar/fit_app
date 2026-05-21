import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/cupertino.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../../theme/app_colors.dart';

/// Native crop using image_cropper (Android / iOS / desktop with IO).
Future<Uint8List?> cropImageBytes(Uint8List bytes, {required bool circle}) async {
  final dir = await getTemporaryDirectory();
  final name = 'crop_${const Uuid().v4()}.jpg';
  final path = p.join(dir.path, name);
  await File(path).writeAsBytes(bytes);
  final cropped = await ImageCropper().cropImage(
    sourcePath: path,
    compressFormat: ImageCompressFormat.jpg,
    compressQuality: 90,
    uiSettings: [
      AndroidUiSettings(
        toolbarTitle: 'Crop',
        toolbarColor: const Color(0xFF161618),
        toolbarWidgetColor: const Color(0xFFFFFFFF),
        activeControlsWidgetColor: AppColors.accent,
        cropStyle: circle ? CropStyle.circle : CropStyle.rectangle,
      ),
      IOSUiSettings(
        title: 'Crop',
        aspectRatioLockEnabled: !circle,
        resetAspectRatioEnabled: true,
        cropStyle: circle ? CropStyle.circle : CropStyle.rectangle,
      ),
    ],
  );
  if (cropped == null) return null;
  return File(cropped.path).readAsBytes();
}
