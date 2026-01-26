#!/bin/bash
# 从 icons/icon.svg 生成各平台所需的图标文件
# 依赖: rsvg-convert (librsvg)
#   macOS: brew install librsvg
#   Ubuntu: apt install librsvg2-bin

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 源文件
SOURCE_SVG="$PROJECT_ROOT/icons/icon.svg"

# 目标目录
BROWSER_ICONS_DIR="$PROJECT_ROOT/executors/browser/icons"

# 检查依赖
if ! command -v rsvg-convert &> /dev/null; then
    echo "❌ 错误: 需要安装 rsvg-convert"
    echo "   macOS: brew install librsvg"
    echo "   Ubuntu: apt install librsvg2-bin"
    exit 1
fi

# 检查源文件
if [ ! -f "$SOURCE_SVG" ]; then
    echo "❌ 错误: 找不到 $SOURCE_SVG"
    exit 1
fi

# === 浏览器扩展图标 ===
echo "🌐 生成浏览器扩展图标..."
mkdir -p "$BROWSER_ICONS_DIR"
for size in 16 48 128; do
    output="$BROWSER_ICONS_DIR/icon${size}.png"
    rsvg-convert -w "$size" -h "$size" "$SOURCE_SVG" -o "$output"
    echo "   ✅ icon${size}.png"
done

# === 未来: 桌面端图标 ===
# DESKTOP_ICONS_DIR="$PROJECT_ROOT/executors/desktop/icons"
# mkdir -p "$DESKTOP_ICONS_DIR"
# rsvg-convert -w 256 -h 256 "$SOURCE_SVG" -o "$DESKTOP_ICONS_DIR/icon.png"

# === 未来: 移动端图标 ===
# MOBILE_ICONS_DIR="$PROJECT_ROOT/executors/mobile/icons"

echo ""
echo "🎉 完成!"
echo "   源文件: icons/icon.svg"
echo "   浏览器: executors/browser/icons/"
