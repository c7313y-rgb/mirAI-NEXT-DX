#!/usr/bin/env bash
# ============================================================
# 副担任 mirAI NEXT (DXハイスクール Edition) - デプロイスクリプト
# v3.0: 複数ファイル構成（index.html + style.css + app.js + assets/）対応
# Usage: bash deploy.sh
# ============================================================
set -e

REPO_URL="https://github.com/c7313y-rgb/mirAI-NEXT-DEMO.git"
WORK_DIR="$(mktemp -d -t miraidep-XXXXXX)"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "▶ ワーキングディレクトリ: $WORK_DIR"
echo "▶ ソース: $SRC_DIR"
echo ""

# Clone
echo "▶ リポジトリをクローン中..."
git clone "$REPO_URL" "$WORK_DIR/repo"
cd "$WORK_DIR/repo"

# Backup existing
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
if [ -f "index.html" ]; then
  BACKUP_NAME="index_backup_${TIMESTAMP}.html"
  echo "▶ 既存 index.html を $BACKUP_NAME にバックアップ"
  mv index.html "$BACKUP_NAME"
fi
if [ -f "style.css" ]; then
  mv style.css "style_backup_${TIMESTAMP}.css"
fi
if [ -f "app.js" ]; then
  mv app.js "app_backup_${TIMESTAMP}.js"
fi

# Copy new files (root)
echo "▶ 新しいファイルをコピー中..."
cp "$SRC_DIR/index.html" ./index.html
cp "$SRC_DIR/style.css"  ./style.css
cp "$SRC_DIR/app.js"     ./app.js
cp "$SRC_DIR/README.md"  ./README.md

# Copy assets directory
echo "▶ assets/ ディレクトリをコピー中..."
rm -rf ./assets
cp -r "$SRC_DIR/assets" ./assets

# .nojekyll (GitHub Pages で _ 始まりや assets/ を確実に配信)
touch .nojekyll

# Verify
echo ""
echo "▶ 配置内容:"
ls -la

# Commit & push
echo ""
echo "▶ 変更をコミット中..."
git add -A
git commit -m "feat(v3.0): DXハイスクール完全対応・実写版画像・5ステップ体験版・副担任mirAI対話

- 複数ファイル構成へ刷新 (index.html + style.css + app.js)
- 実写版画像6枚を組み込み (assets/img/)
- 5ステップ体験版モード完全実装 (入力→生成→レビュー→実施→改善)
- 副担任mirAI対話: ローカル + OpenAI API 両対応
- ダッシュボードを Chart.js で実データ連動
- 3つの料金プラン提示 (60/300/500万円)
- レスポンシブ完全対応" || echo "(変更なし or コミット済)"

echo "▶ プッシュ中..."
git push origin main || git push origin master

echo ""
echo "✅ デプロイ完了!"
echo "▶ サイト: https://c7313y-rgb.github.io/mirAI-NEXT-DEMO/"
echo "▶ 反映まで数十秒〜1分ほどお待ちください。"
