# Tower Defense Game

## Project Overview

Vite + TypeScript + HTML5 Canvasで作成するタワーディフェンスゲーム。

## Tech Stack

- **Build Tool**: Vite
- **Language**: TypeScript
- **Rendering**: HTML5 Canvas API
- **Audio**: Howler.js
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
│   ├── systems/         # ゲームシステム
│   │   ├── SoundManager.ts    # サウンド管理
│   │   └── VisualEffects.ts   # ビジュアルエフェクト
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

### Path (Phase 4)
- 曲がりくねったパス（10ポイント）
- スタート: 緑マーカー (0, 100)
- ゴール: 赤マーカー (800, 550)
- パス幅: 40px
- パス色: 砂色 (#c2b280)

### Tower Types (Phase 3 & 4)

| Type | Cost | Lv.1 Damage | Lv.2 Damage | Lv.3 Damage | Special |
|------|------|-------------|-------------|-------------|---------|
| Archer | 30G | 15 | 25 | 40 | 単体攻撃 |
| Cannon | 80G | 40 | 60 | 90 | 範囲攻撃 |
| Slow | 50G | 5 | 10 | 15 | 減速効果 |

**アップグレードシステム (Phase 4)**
- 3段階レベルアップ可能
- アップグレードコスト: Archer (40G/60G), Cannon (60G/100G), Slow (50G/80G)
- レベルアップでDamage, Range, FireRate向上
- タワークリックで選択 → Upgrade/Sellボタン表示
- 売却: 投資額の50%返金

- 配置: キャンバスクリックで配置（パス上は不可）
- サイズ: 30x30 pixels
- UI: 下部のボタンでタワータイプを選択

### Enemy Types (Phase 3)

| Type | HP倍率 | 速度倍率 | 報酬倍率 | 色 | サイズ |
|------|--------|----------|----------|-----|--------|
| Normal | 1.0x | 1.0x | 1.0x | 赤 (#ff4444) | 20px |
| Speed | 0.5x | 1.8x | 1.2x | オレンジ (#ffaa00) | 16px |
| Tank | 3.0x | 0.5x | 2.0x | 紫 (#8844aa) | 28px |

- スポーン: 左端から出現
- 形状: Normal=四角, Speed=ダイヤモンド, Tank=円
- ステータスはウェーブごとのベース値に倍率を適用

### Projectile
- サイズ: 5px (円形)
- 色: 黄 (#ffff00)
- 速度: 300px/秒
- 追尾型

### Player
- 初期ライフ: 10
- 初期ゴールド: 100

## Wave System (Phase 2 & 3)

5ウェーブ制（敵タイプ混合）:

| Wave | 敵構成 | Base HP | Base Speed | Base Reward |
|------|--------|---------|------------|-------------|
| 1 | Normal×5 | 30 | 50 | 10G |
| 2 | Normal×5, Speed×3 | 40 | 55 | 12G |
| 3 | Normal×5, Speed×5, Tank×2 | 50 | 60 | 15G |
| 4 | Normal×8, Speed×6, Tank×3 | 70 | 65 | 18G |
| 5 | Normal×10, Speed×8, Tank×5 | 100 | 70 | 25G |

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
- Tower Select: タワータイプ選択ボタン (Archer/Cannon/Slow)
- Tower Info Panel: 選択タワーの情報 (Level, Damage, Range, Sell価格)
- Upgrade Button: タワーアップグレード
- Sell Button: タワー売却
- Start/Pause Button: ウェーブ開始・一時停止

## Wave Configuration (Phase 4)

ウェーブ設定は `public/waves.json` で管理可能。
JSONフォーマット:
```json
{
  "waves": [
    {
      "enemies": [{ "type": "normal", "count": 5 }],
      "baseHp": 30,
      "baseSpeed": 50,
      "spawnInterval": 2000,
      "baseReward": 10
    }
  ]
}
```

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
   - 弾丸描画（軌跡エフェクト付き）
   - ビジュアルエフェクト描画
   - オーバーレイ描画（待機中/一時停止/終了時）

## Visual Effects (Phase 5)

### ダメージポップアップ
- 敵がダメージを受けるとダメージ数値が表示
- フェードアウトしながら上昇
- クリティカル（30以上）は黄色で大きく表示

### 弾丸軌跡
- 各弾丸タイプに応じた色の軌跡パーティクル
  - Archer: 緑 (#88ff88)
  - Cannon: オレンジ (#ff8844)
  - Slow: 青 (#88ccff)
- パーティクルは徐々にフェードアウト

### 爆発エフェクト
- Cannonの範囲攻撃時に爆発リングを表示
- 放射状グラデーションで炎のような効果

### ウェーブ開始アニメーション
- 「WAVE X START!」のアナウンス表示
- 拡大→保持→フェードアウトの3フェーズ

## Sound Effects (Phase 5)

Howler.jsを使用した合成サウンド:

| Sound | 説明 | トリガー |
|-------|------|----------|
| shoot_arrow | 矢の発射音 | Archerタワー攻撃時 |
| shoot_cannon | 砲撃音 | Cannonタワー攻撃時 |
| shoot_slow | スロー弾発射音 | Slowタワー攻撃時 |
| hit | ヒット音 | 弾丸が敵に命中時 |
| explosion | 爆発音 | Cannon範囲攻撃時 |
| enemy_die | 敵撃破音 | 敵が倒れた時 |
| enemy_reach | 敵到達音 | 敵がゴールに到達時 |
| tower_place | タワー設置音 | タワー配置時 |
| tower_upgrade | アップグレード音 | タワーレベルアップ時 |
| tower_sell | 売却音 | タワー売却時 |
| wave_start | ウェーブ開始音 | ウェーブ開始時 |
| wave_complete | ウェーブ完了音 | ウェーブクリア時 |
| game_over | ゲームオーバー音 | ゲームオーバー時 |
| victory | 勝利音 | 全ウェーブクリア時 |
