import 'package:dio/dio.dart';
import 'api_exception.dart';
import 'app_config.dart';
import 'secure_storage.dart';
import '../services/auth_service.dart';

/// HTTP client with auth header injection, 401 refresh, and retry.
class ApiClient {
  ApiClient._() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiRoot,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null && status >= 200 && status < 600,
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await SecureStorage.readAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        if (response.statusCode != 401) {
          return handler.next(response);
        }

        final path = response.requestOptions.path;
        if (path.contains('/Auth/login') ||
            path.contains('/Auth/refresh') ||
            response.requestOptions.extra['auth_retry'] == true) {
          onUnauthorized?.call();
          return handler.next(response);
        }

        try {
          final refreshed = await AuthService.instance.tryRefresh();
          if (refreshed == null || refreshed.token.isEmpty) {
            onUnauthorized?.call();
            return handler.next(response);
          }

          final opts = response.requestOptions;
          opts.extra['auth_retry'] = true;
          opts.headers['Authorization'] = 'Bearer ${refreshed.token}';

          final clone = await _dio.fetch(opts);
          return handler.resolve(clone);
        } catch (_) {
          onUnauthorized?.call();
          return handler.next(response);
        }
      },
    ));
  }

  static final ApiClient instance = ApiClient._();
  late final Dio _dio;

  /// Configure listeners/handlers (e.g. force logout on auth failure).
  void Function()? onUnauthorized;

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.get<T>(path, queryParameters: query);
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) async {
    try {
      final res = await _dio.post<T>(path, data: body, queryParameters: query);
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  /// Multipart upload (e.g. profile / progress photos). Field name `file` matches ASP.NET `IFormFile file`.
  Future<Response<T>> postMultipart<T>(
    String path, {
    required List<int> fileBytes,
    required String fileName,
    Map<String, dynamic>? formFields,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final map = <String, dynamic>{
        'file': MultipartFile.fromBytes(fileBytes, filename: fileName),
      };
      if (formFields != null) {
        for (final e in formFields.entries) {
          final v = e.value;
          if (v == null) continue;
          map[e.key] = v is String ? v : v.toString();
        }
      }
      final form = FormData.fromMap(map);
      final res = await _dio.post<T>(
        path,
        data: form,
        onSendProgress: onSendProgress,
      );
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<Response<T>> put<T>(String path, {Object? body}) async {
    try {
      final res = await _dio.put<T>(path, data: body);
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<Response<T>> delete<T>(String path) async {
    try {
      final res = await _dio.delete<T>(path);
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  void _ensureOk(Response res) {
    final status = res.statusCode ?? 0;
    if (status >= 200 && status < 300) return;

    if (status == 401 || status == 403) {
      onUnauthorized?.call();
    }

    final message = _extractMessage(res.data) ?? 'Request failed (status $status)';
    throw ApiException(message, statusCode: status, data: res.data);
  }

  ApiException _mapDioError(DioException e) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      final root = AppConfig.apiRoot;
      if (AppConfig.looksLikeEmulatorDefault) {
        return ApiException(
          'Cannot reach server at $root. Rebuild with your VPS or PC IP, e.g.\n'
          'flutter build apk --dart-define=API_BASE_URL=http://187.127.169.135',
        );
      }
      return ApiException(
        'Cannot reach server at $root. Check VPS is running (gym-gateway on port 80), '
        'Hostinger firewall allows port 80, and use http:// not https:// until SSL is set up.',
      );
    }
    if (e.type == DioExceptionType.badCertificate) {
      return ApiException(
        'TLS certificate error for ${AppConfig.apiHost}. Use http:// for IP-only VPS, or fix SSL.',
      );
    }
    return ApiException(
      _extractMessage(e.response?.data) ?? e.message ?? 'Network error (${AppConfig.apiRoot})',
      statusCode: e.response?.statusCode,
      data: e.response?.data,
    );
  }

  String? _extractMessage(dynamic data) {
    if (data is String && data.trim().isNotEmpty) return data;
    if (data is Map) {
      for (final key in const ['message', 'Message', 'detail', 'title', 'error']) {
        final value = data[key];
        if (value is String && value.trim().isNotEmpty) return value;
      }
    }
    return null;
  }
}
