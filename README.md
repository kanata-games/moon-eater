# 月喰いの城 CASTLE OF THE MOON-EATER

デモンズソウル風の3D死にゲーアクション（ブラウザで動きます）。
初代PS風のローポリ表現で、拠点「月影の祭壇」から要石で各ステージへ旅立つ構成です。

## 主人公

はじめからを選ぶと、2人から旅人を選べます。

- **アスターテ**（近接型）：月刃で斬り込み、刃で受け流す。3つ目の能力は筋力
- **海音**（魔法型）：水弾（弱攻撃）と潮渦（強攻撃）で戦い、水の膜でガード。MPは時間で回復し、切れると杖で殴る。3つ目の能力は理力

## 遊び方

`index.html` をブラウザで開くか、GitHub Pages のURLから遊べます。
進行（レベル・魂・灯した篝火・倒したボス）は、遊んでいるブラウザに自動で保存されます。

## フォルダ構成

```
index.html        画面の骨組みと、スクリプトの読み込み順
css/style.css     HUD・メニューの見た目
js/
  core.js         共通の道具、描画の準備、テクスチャ、空、エフェクト
  audio.js        効果音（音声ファイルなし、その場で合成）
  world.js        ステージの登録・読み込み・片付け、地形パーツ、当たり判定
  rig.js          人型の体とモーション
  characters.js   主人公2人の見た目と能力（CHARS）
  magic.js        海音の水魔法
  enemies.js      攻撃の定義（ATK）、敵の種類（TYPES）、敵AI
  player.js       プレイヤーの行動と被ダメージ
  game.js         進行・セーブ・入力・メニュー・HUD・カメラ・メインループ
stages/
  nexus.js        拠点「月影の祭壇」（要石の一覧 ARCHSTONES もここ）
  castle.js       ステージ1「月喰いの城」
```

## ステージの足し方

1. `stages/castle.js` をまねて `stages/新しいステージ.js` を作り、`defineStage({...})` で登録する
2. `index.html` のステージの並びに `<script src="stages/新しいステージ.js"></script>` を1行足す
3. `stages/nexus.js` の `ARCHSTONES` で、そのステージの要石を有効にする（`stage: 'ステージのid'`）

新しい敵は `js/enemies.js` の `TYPES` に、新しい攻撃は `ATK` に追加します。
