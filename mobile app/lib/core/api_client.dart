import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'api_exception.dart';
import 'app_config.dart';
import 'secure_storage.dart';
import '../services/auth_service.dart';

typedef AccessTokenReader = Future<String?> Function();
typedef AccessTokenRefresher = Future<String?> Function();

/// HTTP client with auth header injection, 401 single-flight refresh, and one retry.
class ApiClient {
  ApiClient._()
      : _readAccessToken = SecureStorage.readAccessToken,
        _refreshAccessToken = _defaultRefreshAccessToken {
    _dio = Dio(_baseOptions(AppConfig.apiRoot));
    _installInterceptor();
  }

  /// Test seam: inject Dio (fake adapter), token reader, and refresher.
  ApiClient.forTest({
    required Dio dio,
    required AccessTokenReader readAccessToken,
    required AccessTokenRefresher refreshAccessToken,
  })  : _readAccessToken = readAccessToken,
        _refreshAccessToken = refreshAccessToken {
    _dio = dio;
    _installInterceptor();
  }

  static Future<String?> _defaultRefreshAccessToken() async {
    final refreshed = await AuthService.instance.tryRefresh();
    if (refreshed == null || refreshed.token.isEmpty) return null;
    return refreshed.token;
  }

  static BaseOptions _baseOptions(String baseUrl) => BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 20),
        validateStatus: (status) => status != null && status >= 200 && status < 600,
      );

  static const _kAuthRetry = 'auth_retry';
  static const _kRebuildBody = 'rebuild_body';

  static const forbiddenMessage =
      "You don't have permission to perform this action. Ask an administrator if you need access.";

  static const sessionExpiredMessage =
      'Your session has expired. Please sign in again.';

  void _installInterceptor() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _readAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        if (response.statusCode != 401) {
          return handler.next(response);
        }

        final opts = response.requestOptions;
        final path = opts.path;

        if (_isCredentialAuthPath(path) || _isLogoutPath(path)) {
          return handler.next(response);
        }

        if (_isRefreshPath(path)) {
          onUnauthorized?.call();
          return handler.next(response);
        }

        if (opts.extra[_kAuthRetry] == true) {
          onUnauthorized?.call();
          return handler.next(response);
        }

        final startedGen = _authGeneration;
        try {
          final token = await _refreshAccessTokenSingleFlight();
          if (_authGeneration != startedGen) {
            return handler.next(response);
          }
          if (token == null || token.isEmpty) {
            onUnauthorized?.call();
            return handler.next(response);
          }

          opts.extra[_kAuthRetry] = true;
          opts.headers['Authorization'] = 'Bearer $token';

          final rebuild = opts.extra[_kRebuildBody];
          if (rebuild is Function) {
            opts.data = rebuild();
          } else if (opts.data is FormData) {
            return handler.next(response);
          }

          final clone = await _dio.fetch(opts);
          return handler.resolve(clone);
        } catch (_) {
          if (_authGeneration == startedGen) {
            onUnauthorized?.call();
          }
          return handler.next(response);
        }
      },
    ));
  }

  static bool _isRefreshPath(String path) {
    return path.toLowerCase().contains('/auth/refresh');
  }

  static bool _isLogoutPath(String path) {
    return path.toLowerCase().contains('/auth/logout');
  }

  static bool _isCredentialAuthPath(String path) {
    final p = path.toLowerCase();
    return p.contains('/auth/login') ||
        p.contains('/auth/firebase-login') ||
        p.contains('/auth/forgot-password') ||
        p.contains('/auth/reset-password');
  }

  static final ApiClient instance = ApiClient._();
  late final Dio _dio;
  final AccessTokenReader _readAccessToken;
  final AccessTokenRefresher _refreshAccessToken;

  /// Bumped on logout / failed session so in-flight refresh waiters do not retry.
  int _authGeneration = 0;
  Future<String?>? _inFlightRefresh;
  int _inFlightRefreshGeneration = -1;

  /// Configure listeners/handlers (e.g. force logout on auth failure).
  void Function()? onUnauthorized;

  /// Drop queued 401 retries (user signed out, or local session cleared).
  void invalidateAuthRecovery() {
    _authGeneration++;
  }

  Future<String?> _refreshAccessTokenSingleFlight() {
    final gen = _authGeneration;
    if (_inFlightRefresh != null && _inFlightRefreshGeneration == gen) {
      return _inFlightRefresh!;
    }

    _inFlightRefreshGeneration = gen;
    final future = _performRefresh(gen);
    _inFlightRefresh = future;
    return future.whenComplete(() {
      if (identical(_inFlightRefresh, future)) {
        _inFlightRefresh = null;
      }
    });
  }

  Future<String?> _performRefresh(int gen) async {
    if (_authGeneration != gen) return null;
    final token = await _refreshAccessToken();
    if (_authGeneration != gen) return null;
    return token;
  }

  static final _jsonOptions = Options(contentType: Headers.jsonContentType);

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
      final res = await _dio.post<T>(
        path,
        data: body,
        queryParameters: query,
        options: _jsonOptions,
      );
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  /// Multipart upload (e.g. profile / progress photos). Field name `file` matches ASP.NET `IFormFile file`.
  ///
  /// FormData is rebuilt from in-memory bytes on a 401 retry so the body is not a consumed stream.
  Future<Response<T>> postMultipart<T>(
    String path, {
    required List<int> fileBytes,
    required String fileName,
    Map<String, dynamic>? formFields,
    ProgressCallback? onSendProgress,
  }) async {
    if (fileBytes.isEmpty) {
      throw const ApiException('Photo data is empty. Try taking the photo again.');
    }

    try {
      final safeName = _normalizeUploadFileName(fileName);
      FormData buildForm() {
        final map = <String, dynamic>{
          'file': MultipartFile.fromBytes(
            fileBytes,
            filename: safeName,
            contentType: MediaType('image', 'jpeg'),
          ),
        };
        if (formFields != null) {
          for (final e in formFields.entries) {
            final v = e.value;
            if (v == null) continue;
            map[e.key] = v is String ? v : v.toString();
          }
        }
        return FormData.fromMap(map);
      }

      final res = await _dio.post<T>(
        path,
        data: buildForm(),
        onSendProgress: onSendProgress,
        options: Options(
          sendTimeout: const Duration(minutes: 2),
          receiveTimeout: const Duration(seconds: 60),
          extra: {_kRebuildBody: buildForm},
        ),
      );
      _ensureOk(res);
      return res;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  static String _normalizeUploadFileName(String fileName) {
    final trimmed = fileName.trim();
    if (trimmed.isEmpty) return 'profile.jpg';
    final lower = trimmed.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return trimmed;
    if (lower.endsWith('.png') || lower.endsWith('.webp')) return trimmed;
    return '$trimmed.jpg';
  }

  Future<Response<T>> put<T>(String path, {Object? body}) async {
    try {
      final res = await _dio.put<T>(path, data: body, options: _jsonOptions);
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

  Future<List<int>> downloadBytes(String path) async {
    try {
      final res = await _dio.get<List<int>>(
        path,
        options: Options(responseType: ResponseType.bytes),
      );
      _ensureOk(res);
      return res.data ?? const [];
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  void _ensureOk(Response res) {
    final status = res.statusCode ?? 0;
    if (status >= 200 && status < 300) return;

    if (status == 403) {
      final extracted = _extractMessage(res.data);
      final message = (extracted != null &&
              extracted.isNotEmpty &&
              !extracted.toLowerCase().contains('forbidden'))
          ? extracted
          : forbiddenMessage;
      throw ApiException(message, statusCode: status, data: res.data);
    }

    if (status == 401) {
      throw ApiException(
        _extractMessage(res.data) ?? sessionExpiredMessage,
        statusCode: status,
        data: res.data,
      );
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
          'flutter build apk --dart-define=API_BASE_URL=https://tigerfitness.tech',
        );
      }
      return ApiException(
        'Cannot reach server at $root. Check your connection and try again.',
      );
    }
    if (e.type == DioExceptionType.badCertificate) {
      return ApiException(
        'TLS certificate error for ${AppConfig.apiHost}. Contact support if this persists.',
      );
    }
    final status = e.response?.statusCode;
    if (status == 403) {
      return ApiException(
        forbiddenMessage,
        statusCode: status,
        data: e.response?.data,
      );
    }
    if (status == 401) {
      return ApiException(
        sessionExpiredMessage,
        statusCode: status,
        data: e.response?.data,
      );
    }
    if (status == 413) {
      return ApiException(
        'Photo is too large. Try a smaller image (max 5 MB).',
        statusCode: status,
        data: e.response?.data,
      );
    }
    return ApiException(
      _extractMessage(e.response?.data) ??
          e.message ??
          'Upload failed (${AppConfig.apiRoot}${status != null ? ', status $status' : ''})',
      statusCode: status,
      data: e.response?.data,
    );
  }

  String? _extractMessage(dynamic data) {
    if (data is String && data.trim().isNotEmpty) return data.trim();
    if (data is Map) {
      for (final key in const ['message', 'Message', 'detail', 'title', 'error']) {
        final value = data[key];
        if (value is String && value.trim().isNotEmpty) return value.trim();
      }
    }
    return null;
  }
}
