# Tower Defense Game

## Project Overview

Vite + TypeScript + HTML5 Canvasで作成するタワーディフェンスゲーム。

## Tech Stack

- **Build Tool**: Vite
- **Language**: TypeScript
- **Rendering**: HTML5 Canvas API
- **Package Manager**: npm

## Directory Structure

```
tower-defense/
├── src/
│   ├── main.ts          # エントリーポイント
│   ├── style.css        # スタイル
│   ├── game/            # ゲームコア
│   │   └── Game.ts      # メインゲームクラス
│   ├── entities/        # ゲームエンティティ
│   │   ├── Tower.ts     # タワークラス
│   │   ├── Enemy.ts     # 敵クラス
│   │   └── Projectile.ts # 弾丸クラス
│   ├── systems/         # ゲームシステム（将来用）
│   ├── types/           # 型定義
│   │   └── index.ts     # 共通型・設定
│   └── utils/           # ユーティリティ
│       └── math.ts      # 数学関数
├── index.html
├── package.json
└── tsconfig.json
```

## Game Specifications

### Canvas
- Size: 800x600 pixels
- Background: ダークグレー (#333)

### Path
- 直線パス: 左端 (0, 300) → 右端 (800, 300)
- パス幅: 40px
- パス色: 砂色 (#c2b280)

### Tower
- 配置: キャンバスクリックで配置（パス上は不可）
- サイズ: 30x30 pixels
- 色: 青 (#4488ff)
- 射程: 100px (円形)
- 攻撃速度: 1発/秒
- ダメージ: 10
- コスト: 50ゴールド

### Enemy
- スポーン: 左端から出現
- サイズ: 20x20 pixels
- 色: 赤 (#ff4444)
- ステータスはウェーブごとに変化

### Projectile
- サイズ: 5px (円形)
- 色: 黄 (#ffff00)
- 速度: 300px/秒
- 追尾型

### Player
- 初期ライフ: 10
- 初期ゴールド: 100

## Wave System (Phase 2)

5ウェーブ制:

| Wave | 敵数 | HP | 速度 | 報酬 |
|------|------|-----|------|------|
| 1 | 5 | 30 | 50 | 10G |
| 2 | 8 | 40 | 55 | 12G |
| 3 | 10 | 50 | 60 | 15G |
| 4 | 12 | 70 | 65 | 18G |
| 5 | 15 | 100 | 70 | 25G |

## Game States

- **waiting**: ウェーブ開始待ち（タワー配置可能）
- **playing**: ウェーブ進行中
- **paused**: 一時停止
- **gameover**: ゲームオーバー
- **victory**: 全ウェーブクリア

## UI Elements

- Wave: 現在のウェーブ / 総ウェーブ数
- Lives: 残りライフ
- Gold: 所持ゴールド
- Start/Pause Button: ウェーブ開始・一時停止

## Commands

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npx tsc --noEmit
```

## Game Loop

1. Update (playingステート時のみ)
   - 敵のスポーン（ウェーブ設定に基づく）
   - 敵の移動
   - タワーの攻撃判定
   - 弾丸の移動と衝突判定
   - 敵のゴール到達判定
   - 敵撃破時のゴールド獲得
   - ウェーブ完了チェック

2. Render
   - 背景描画
   - パス描画
   - タワー描画（射程円付き）
   - 敵描画（HPバー付き）
   - 弾丸描画
   - オーバーレイ描画（待機中/一時停止/終了時）
