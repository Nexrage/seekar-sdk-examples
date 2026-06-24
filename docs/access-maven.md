# Access — Android (`io.seekar:seekar-android`)

The Android SDK (AAR) is published to an **authenticated Maven repository**
(Reposilite, hosted on Azure AKS). You need the distribution **username + token**
(HTTP Basic).

## 1. Add the repository

`settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://maven-dev.seekar.io/releases") // prod: maven.seekar.io
            credentials {
                username = providers.gradleProperty("seekarMavenUser").orNull
                    ?: System.getenv("SEEKAR_DIST_USER")
                password = providers.gradleProperty("seekarMavenToken").orNull
                    ?: System.getenv("SEEKAR_DIST_TOKEN")
            }
        }
    }
}
```

Put the credentials in `~/.gradle/gradle.properties` (never commit):

```properties
seekarMavenUser=seekar
seekarMavenToken=<your dist token>
```

## 2. Add the dependency + plugin

```kotlin
// app/build.gradle.kts
plugins { id("io.seekar.gradle") }   // injects manifest, permissions, ARCore key

dependencies {
    implementation("io.seekar:seekar-android:<version>")
}
```

## 3. Use it

```kotlin
val view = SeekARView(context).apply {
    configure(collectibleId = id, modelUrl = url, targetLat = lat, targetLng = lng)
}
```

Bake your runtime **license key** (`SEEKAR_LICENSE_KEY`) into the build; the SDK
checks in on init. See [access overview](./README.md).
