# Build Directory

The build directory is used to house all the build files and assets for your application.

The structure is:

* bin - Output directory
* darwin - macOS specific files
* windows - Windows specific files

## Mac

The `darwin` directory holds files specific to Mac builds.
These may be customised and used as part of the build. To return these files to the default state, simply delete them
and
build with `wails build`.

The directory contains the following files:

- `Info.plist` - the main plist file used for Mac builds. It is used when building using `wails build`.
- `Info.dev.plist` - same as the main plist file but used when building using `wails dev`.

## Windows

The `windows` directory contains the manifest and rc files used when building with `wails build`.
These may be customised for your application. To return these files to the default state, simply delete them and
build with `wails build`.

- `icon.ico` - The icon used for the application. This is used when building using `wails build`. If you wish to
  use a different icon, simply replace this file with your own. If it is missing, a new `icon.ico` file
  will be created using the `appicon.png` file in the build directory.
- `installer/*` - The files used to create the Windows installer. These are used when building using `wails build`.
- `info.json` - Application details used for Windows builds. The data here will be used by the Windows installer,
  as well as the application itself (right click the exe -> properties -> details)
- `wails.exe.manifest` - The main application manifest file.

## Linux

Linux builds do not require special build files. The application is compiled as a standalone binary.

### Build Requirements

```bash
# CentOS/RHEL/Rocky Linux 8+
sudo dnf install -y gcc-c++ pkgconfig webkit2gtk3-devel

# Ubuntu/Debian
sudo apt install -y build-essential pkg-config libwebkit2gtk-4.0-dev

# Fedora
sudo dnf install -y gcc-c++ pkgconfig webkit2gtk4.0-devel
```

### Build Commands

```bash
# Development build
wails build

# Production build (optimized)
wails build -clean -upx

# The output binary will be at:
# build/bin/markdown-gen-go
```

### Distribution

For Linux distribution, you can:

1. **Direct binary**: Distribute the compiled binary directly
2. **AppImage**: Create a portable AppImage package
3. **RPM/DEB**: Create system packages

#### Creating AppImage

```bash
# Install appimagetool
wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage

# Create AppDir structure
mkdir -p AppDir/usr/bin
cp build/bin/markdown-gen-go AppDir/usr/bin/

# Create desktop entry
cat > AppDir/markdown-gen-go.desktop << 'EOF'
[Desktop Entry]
Name=Markdown Studio Pro
Exec=markdown-gen-go
Icon=markdown-gen-go
Type=Application
Categories=Office;TextEditor;
EOF

# Create AppImage
./appimagetool-x86_64.AppImage AppDir
```

### Desktop Entry (Optional)

To add the application to the system menu:

```bash
# Create desktop entry
cat > ~/.local/share/applications/markdown-gen-go.desktop << 'EOF'
[Desktop Entry]
Name=Markdown Studio Pro
Comment=Markdown Editor with AI Assistant
Exec=/path/to/markdown-gen-go
Icon=markdown-gen-go
Terminal=false
Type=Application
Categories=Office;TextEditor;
StartupNotify=true
EOF
```
