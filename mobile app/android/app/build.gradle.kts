import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.pulsefit.member"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    defaultConfig {
        applicationId = "com.pulsefit.member"
        minSdk = maxOf(flutter.minSdkVersion, 26)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        // Debug and profile keep the Android debug keystore so local/dev builds stay usable.
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("profile") {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            // No silent debug-keystore fallback for release/production.
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

gradle.taskGraph.whenReady {
    val assemblingRelease =
        allTasks.any { task ->
            val name = task.name
            name.contains("Release") &&
                (
                    name.startsWith("assemble") ||
                        name.startsWith("bundle") ||
                        name.startsWith("package") ||
                        name.contains("Sign")
                )
        }
    if (assemblingRelease && !keystorePropertiesFile.exists()) {
        throw GradleException(
            "Release/production Android builds require android/key.properties " +
                "(upload keystore). Debug/profile builds use the debug keystore. " +
                "Set ANDROID_KEYSTORE_* GitHub secrets or a local key.properties file. " +
                "For day-to-day APKs use `flutter build apk` (debug), not --release.",
        )
    }
}

flutter {
    source = "../.."
}
