import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/core/api_client.dart';
import 'package:pulsefit/core/api_exception.dart';

class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.onFetch);

  final Future<ResponseBody> Function(RequestOptions options, List<int> body)
      onFetch;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final bytes = <int>[];
    if (requestStream != null) {
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
    }
    return onFetch(options, bytes);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonBody(int status, Map<String, dynamic> json) {
  return ResponseBody.fromString(
    jsonEncode(json),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

ApiClient _client({
  required HttpClientAdapter adapter,
  required Map<String, String?> tokens,
  required AccessTokenRefresher refresh,
  void Function()? onUnauthorized,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'http://test.local/api',
      validateStatus: (status) => status != null && status >= 200 && status < 600,
    ),
  );
  dio.httpClientAdapter = adapter;
  final client = ApiClient.forTest(
    dio: dio,
    readAccessToken: () async => tokens['access'],
    refreshAccessToken: refresh,
  );
  client.onUnauthorized = onUnauthorized;
  return client;
}

void main() {
  test('HTTP 403 keeps the session and surfaces access denied', () async {
    final tokens = {'access': 'live-token', 'refresh': 'refresh-token'};
    var unauthorized = 0;
    var refreshCalls = 0;

    final client = _client(
      tokens: tokens,
      onUnauthorized: () => unauthorized++,
      refresh: () async {
        refreshCalls++;
        return 'should-not-run';
      },
      adapter: _ScriptedAdapter((options, _) async {
        expect(options.headers['Authorization'], 'Bearer live-token');
        return _jsonBody(403, {'message': 'Forbidden'});
      }),
    );

    try {
      await client.get('/me/diet-plan');
      fail('expected ApiException');
    } on ApiException catch (e) {
      expect(e.isForbidden, isTrue);
      expect(e.statusCode, 403);
      expect(e.message, contains('permission'));
    }

    expect(tokens['access'], 'live-token');
    expect(tokens['refresh'], 'refresh-token');
    expect(unauthorized, 0);
    expect(refreshCalls, 0);
  });

  test('401 then successful refresh retries the original request once', () async {
    final tokens = <String, String?>{'access': 'expired'};
    var unauthorized = 0;
    var refreshCalls = 0;
    var resourceCalls = 0;

    final client = _client(
      tokens: tokens,
      onUnauthorized: () => unauthorized++,
      refresh: () async {
        refreshCalls++;
        tokens['access'] = 'fresh';
        return 'fresh';
      },
      adapter: _ScriptedAdapter((options, _) async {
        if (options.path.contains('/me/profile')) {
          resourceCalls++;
          final auth = options.headers['Authorization']?.toString() ?? '';
          if (auth.contains('fresh')) {
            return _jsonBody(200, {'ok': true});
          }
          return _jsonBody(401, {'message': 'expired'});
        }
        return _jsonBody(404, {'message': 'unexpected'});
      }),
    );

    final res = await client.get('/me/profile');
    expect(res.statusCode, 200);
    expect(refreshCalls, 1);
    expect(resourceCalls, 2);
    expect(unauthorized, 0);
    expect(tokens['access'], 'fresh');
  });

  test('401 then failed refresh signs out and does not retry successfully', () async {
    final tokens = <String, String?>{'access': 'expired'};
    var unauthorized = 0;
    var refreshCalls = 0;
    var resourceCalls = 0;

    final client = _client(
      tokens: tokens,
      onUnauthorized: () {
        unauthorized++;
        tokens['access'] = null;
        tokens['refresh'] = null;
      },
      refresh: () async {
        refreshCalls++;
        return null;
      },
      adapter: _ScriptedAdapter((options, _) async {
        resourceCalls++;
        return _jsonBody(401, {'message': 'expired'});
      }),
    );

    try {
      await client.get('/me/profile');
      fail('expected ApiException');
    } on ApiException catch (e) {
      expect(e.isUnauthorized, isTrue);
    }

    expect(refreshCalls, 1);
    expect(resourceCalls, 1);
    expect(unauthorized, 1);
    expect(tokens['access'], isNull);
  });

  test('retry limit: a second 401 after refresh does not refresh again', () async {
    final tokens = <String, String?>{'access': 'expired'};
    var unauthorized = 0;
    var refreshCalls = 0;
    var resourceCalls = 0;

    final client = _client(
      tokens: tokens,
      onUnauthorized: () => unauthorized++,
      refresh: () async {
        refreshCalls++;
        tokens['access'] = 'still-bad';
        return 'still-bad';
      },
      adapter: _ScriptedAdapter((options, _) async {
        resourceCalls++;
        return _jsonBody(401, {'message': 'expired'});
      }),
    );

    try {
      await client.get('/me/profile');
      fail('expected ApiException');
    } on ApiException catch (e) {
      expect(e.isUnauthorized, isTrue);
    }

    expect(refreshCalls, 1);
    expect(resourceCalls, 2);
    expect(unauthorized, 1);
  });

  test('concurrent 401s share a single in-flight refresh', () async {
    final tokens = <String, String?>{'access': 'expired'};
    var refreshCalls = 0;
    var resourceCalls = 0;
    final releaseRefresh = Completer<void>();

    final client = _client(
      tokens: tokens,
      refresh: () async {
        refreshCalls++;
        await releaseRefresh.future;
        tokens['access'] = 'fresh';
        return 'fresh';
      },
      adapter: _ScriptedAdapter((options, _) async {
        resourceCalls++;
        final auth = options.headers['Authorization']?.toString() ?? '';
        if (auth.contains('fresh')) {
          return _jsonBody(200, {'ok': true});
        }
        return _jsonBody(401, {'message': 'expired'});
      }),
    );

    final futures = [
      client.get('/me/profile'),
      client.get('/me/dashboard'),
      client.get('/me/membership'),
    ];

    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(refreshCalls, 1);
    releaseRefresh.complete();

    final results = await Future.wait(futures);
    expect(results.every((r) => r.statusCode == 200), isTrue);
    expect(refreshCalls, 1);
    expect(resourceCalls, 6);
  });

  test('expired-token photo upload retries once with rebuilt multipart body', () async {
    final tokens = <String, String?>{'access': 'expired'};
    var refreshCalls = 0;
    var uploadCalls = 0;
    var successUploads = 0;

    final client = _client(
      tokens: tokens,
      refresh: () async {
        refreshCalls++;
        tokens['access'] = 'fresh';
        return 'fresh';
      },
      adapter: _ScriptedAdapter((options, body) async {
        if (!options.path.contains('/me/profile/photo')) {
          return _jsonBody(404, {'message': 'unexpected'});
        }
        uploadCalls++;
        expect(body, isNotEmpty);
        final auth = options.headers['Authorization']?.toString() ?? '';
        if (auth.contains('fresh')) {
          successUploads++;
          return _jsonBody(200, {'photoUrl': '/uploads/p.jpg'});
        }
        return _jsonBody(401, {'message': 'expired'});
      }),
    );

    final res = await client.postMultipart(
      '/me/profile/photo',
      fileBytes: List<int>.filled(16, 7),
      fileName: 'profile.jpg',
    );

    expect(res.statusCode, 200);
    expect(refreshCalls, 1);
    expect(uploadCalls, 2);
    expect(successUploads, 1);
  });

  test('logout during refresh cancels retry and does not complete the upload', () async {
    final tokens = <String, String?>{'access': 'expired'};
    var unauthorized = 0;
    var refreshCalls = 0;
    var uploadCalls = 0;
    var successUploads = 0;
    final releaseRefresh = Completer<String?>();

    late ApiClient client;
    client = _client(
      tokens: tokens,
      onUnauthorized: () => unauthorized++,
      refresh: () async {
        refreshCalls++;
        return releaseRefresh.future;
      },
      adapter: _ScriptedAdapter((options, _) async {
        uploadCalls++;
        final auth = options.headers['Authorization']?.toString() ?? '';
        if (auth.contains('stale-after-logout')) {
          successUploads++;
          return _jsonBody(200, {'photoUrl': '/uploads/p.jpg'});
        }
        return _jsonBody(401, {'message': 'expired'});
      }),
    );

    final upload = client.postMultipart(
      '/me/profile/photo',
      fileBytes: List<int>.filled(8, 1),
      fileName: 'profile.jpg',
    );

    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(refreshCalls, 1);

    client.invalidateAuthRecovery();
    tokens['access'] = null;
    releaseRefresh.complete('stale-after-logout');

    try {
      await upload;
      fail('expected ApiException');
    } on ApiException catch (e) {
      expect(e.isUnauthorized, isTrue);
    }

    expect(uploadCalls, 1);
    expect(successUploads, 0);
    expect(unauthorized, 0);
  });
}
