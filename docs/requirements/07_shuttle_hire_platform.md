# MKシャトルハイヤー予約プラットフォーム
## 要件定義＋仕様書

**ステータス：** 本番稼働中  
**バージョン：** 2.0  
**作成者：** 八木健太  
**作成日：** 2026年6月  
**上書き対象：** `05_shuttle_proposal.md` / `05b_shuttle_technical_requirements.md` / `requirements/05_shuttle.md`

> **v2.0 変更内容（2026-06-18）：**
> - **Phase 1 完了** ― `https://shuttle-hire-platform.vercel.app` にて本番稼働開始
> - **出発時刻制約を撤廃**：DBの `CHECK (departure_time BETWEEN '11:00' AND '15:00')` 制約を削除。任意の時刻が設定可能（運用上は従来の時間帯が多いが、システム制約は持たない）
> - **AviationStack API 統合**：フライト出発時刻・遅延・ターミナル情報をドライバーUIにリアルタイム表示
> - **ターミナル自動停車順**：乗客のフライト情報からT1/T2への最適停車順を自動算出
> - **スーパー管理者機能追加**：`is_super_admin` フラグ・専用ダッシュボード・ユーザーCRUD管理（Section 16 追加）
> - **セキュリティ監視機能追加**：`auth_events` テーブル・不審IP検出・管理者アラート（Section 5-3 更新）
> - **QRチケットに車両ナンバー表示**：`shuttle_slots.vehicle_plate` カラム追加。ゲストのチケットに乗車車両を表示
> - **乗務員コード表示ラベル変更**：ドライバーUI上の「乗務員コード」を「社員番号」に変更
> - **乗務員マスタはDOS参照**：スーパー管理者画面でのドライバー新規作成ボタンを廃止。乗務員マスタ・車両マスタ・パートナーマスタはDispatch OSが正
> - **本番URL確定**：`https://shuttle-hire-platform.vercel.app`（ドメイン移行まで）
>
> **v1.4 変更内容（2026-06-17）：**
> - **内部コンテキストを分離**：エミレーツ関連の内部目標を `docs/internal/internal_business_context.md` へ移動
> - **スロット運用ルール確定**：デフォルト3台/日・前日17時に増減確定・前日17時以降にスロット公開
> - **ゼロ予約キャンセルフロー確定**：出発時ゼロ → 15分待機 → 乗務員が配車係に通知 → 配車係がキャンセル確定
> - **団体案件のスコープ外確定**：満席表示 + TMK連絡先のみ
> - **受注タイミング4パターン確定**：チェックイン時 / 前夜 / 当日朝 / チェックアウト時
>
> **v1.3 変更内容（2026-05-13）：**
> - **Phase 4追加**：Booknetics API統合による自動配車
> - `driver_users.is_emirates_route` フラグ追加
> - `booknetics_sync_logs` テーブル追加
> - Section 14 新設：Booknetics API統合仕様
>
> **v1.2 変更内容（2026-05-13）：**
> - R1〜R8 全運用ルール確定
> - ゲスト確認方式：QRコード＋公開確認ページ・電子署名に変更
> - `tmk_admin_users` / `driver_users` テーブル定義追加

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [ステークホルダーと3ロール定義](#2-ステークホルダーと3ロール定義)
3. [ビジネスフローと状態遷移](#3-ビジネスフローと状態遷移)
4. [機能要件](#4-機能要件)
5. [非機能要件](#5-非機能要件)
6. [DBスキーマ（Supabase PostgreSQL）](#6-dbスキーマsupabase-postgresql)
7. [RLSポリシー設計](#7-rlsポリシー設計)
8. [画面一覧と遷移](#8-画面一覧と遷移)
9. [技術スタック](#9-技術スタック)
10. [派生システム：コンシェルジュモニタープログラム](#10-派生システムコンシェルジュモニタープログラム)
11. [フェーズ別展開計画](#11-フェーズ別展開計画)
12. [運用ルール確認事項](#12-運用ルール確認事項)
13. [Dispatch OS連携ロードマップ](#13-dispatch-os連携ロードマップ)
14. [Booknetics API統合仕様（Phase 4）](#14-booknetics-api統合仕様phase-4)
15. [用語定義](#15-用語定義)
16. [スーパー管理者機能仕様](#16-スーパー管理者機能仕様)

---

## 1. プロジェクト概要

### 1-1. システム名

**MKシャトルハイヤー予約プラットフォーム**  
本番URL：`https://shuttle-hire-platform.vercel.app`（将来ドメイン：`shuttle.tokyomk.com`）

### 1-2. 目的

ホテルフロント・ベルデスクが成田空港行きシャトルハイヤーの空き枠をリアルタイムで確認し、TMKへの電話・折り返しゼロで予約を完結させるB2B予約システム。

### 1-3. 背景と課題

#### 背景と課題

ホテルに宿泊中のゲストが成田空港へ向かう際、現状は電話でTMKに問い合わせるしかなく、双方に対応コストが発生している。また空き状況がリアルタイムで把握できないため、案内のタイミングを逃すケースも多い。

本システムはこの課題を解決し、**ホテルスタッフが即座に空き確認・予約完結できる環境**を提供する。

**スロット運用方針：**
- **デフォルト台数**：3台/日を基本とし、前日17時に増減を確定
- **スロット公開タイミング**：前日17時以降にスロットを `open` にする（それ以前は非公開）
- **出発時刻**：任意（DB制約なし。運用上は概ね11:00〜16:00の範囲内が多い）
- **使用車両**：Vクラスベンツ / アルファード（共通）

> 内部事業コンテキストは `docs/internal/internal_business_context.md` を参照（社内限定）。

#### 現状のフロー（問題あり）
```
ホテルスタッフ → 電話でTMKに「成田まで〇名いけますか？」
    ↓
TMK側が空き確認（手動・口頭）
    ↓
折り返し電話
    ↓
フロントがゲストに伝える
```

**問題点：**
- 空き状況がリアルタイムで見えない
- 電話対応コストが双方に発生（TMK・ホテル両方）
- 満車・空き過多の把握が遅れ、運行効率が下がる

#### 解決後のフロー
```
ホテルスタッフ → ブラウザで空き枠カレンダーを開く
    ↓
空き枠をクリック → ゲスト情報を入力（30秒）
    ↓
QRチケットを表示 → ゲストのスマートフォンに案内（完結）
```

### 1-4. スコープ

| スコープ内 | スコープ外 |
|---|---|
| ホテルスタッフによる代理予約 | ゲスト本人によるオンライン予約 |
| TMK管理者による枠・予約管理 | 決済処理（後請求・月次精算のみ） |
| ドライバーへの当日乗車リスト配信 | GPS追跡・リアルタイム位置情報（Phase 3以降） |
| コンシェルジュモニタープログラム（Section 10） | 往復予約（片道のみ） |

### 1-5. 第一号パートナー

**ホテルオークラ東京**  
- フロント・ベルデスクによる代理予約
- 成田空港固定ルート
- 月次後払い精算
- 本番稼働中

### 1-6. 既存アセット

`narita-shuttle-v2`（SQLiteプロトタイプ）に以下の設計資産が存在する。本番開発ではスキーマ設計の参考として活用したが、**コードは流用しない（Supabase対応でゼロから実装）**。

---

## 2. ステークホルダーと3ロール定義

### 2-1. ロール一覧

| ロールID | 名称 | 人数規模 | 主な操作 | 利用端末 | 接続環境 |
|---|---|---|---|---|---|
| `hotel_staff` | ホテル共有アカウント（フロントPC固定ログイン。1ホテル1アカウント） | 共有PC 1台 | 空き確認・予約入力・QRコード表示・予約照会/キャンセル | フロント共有デスクトップPC | ホテル有線LAN |
| `tmk_admin` | TMK管理者（運行担当） | 1〜3名 | 出発枠管理・全予約管理・乗車リスト・ドライバーアサイン・請求レポート | PC | オフィス有線LAN |
| `driver` | TMKドライバー | 1〜3名/便 | 担当便の乗車リスト確認・ステータス更新・フライト情報確認 | タブレット（電脳交通）/ スマートフォン | LTE（移動中） |
| `super_admin` | スーパー管理者（tmk_adminの上位権限） | 1〜2名 | ユーザーCRUD・売上統計ダッシュボード | PC | オフィス有線LAN |

### 2-2. ゲストの位置づけ

ゲスト（宿泊客）はシステムに**直接アクセスしない**。ホテルスタッフが代理入力し、ゲストにはQRコードを表示してスマートフォンでスキャンしてもらう。これはB2B設計の最重要原則。

### 2-3. ホテル単位のデータ分離

ホテルAのスタッフはホテルAの予約のみ参照・操作可能。他ホテルのデータは完全不可視（RLS徹底）。

---

## 3. ビジネスフローと状態遷移

### 3-1. 受注シナリオ4パターン

#### シナリオA：チェックイン時案内
```
ゲストがチェックイン
    ↓
フロントスタッフ「成田へのシャトルハイヤーをご案内できます」
    ↓
システムを開き出発日の枠を確認（翌日以降）
    ↓
空き枠をクリック → ゲスト情報入力（名前・人数・フライト便名・荷物数）
    ↓
QRチケット表示 → ゲストのスマートフォンにスキャンしてもらう
```

#### シナリオB：前日案内（ベルデスクから）
```
ゲストが翌朝の出発について相談
    ↓
システムで当日の残席を確認（空いているか判断）
    ↓
席を押さえる → QRチケット再表示
```

#### シナリオC：チェックアウト当日朝（滑り込み）
```
ゲストが当日出発でシャトルを希望
    ↓
システムで当日の空き枠を確認（締切前かチェック）
    ↓
空きがあれば即予約 → QRコード表示
    ↓
締切済みの場合：「受付終了」を表示 → TMK配車センターへ案内（通常ハイヤー）
```

#### シナリオD：チェックアウト時（当日その場で）
```
ゲストがチェックアウト手続き中に「今から成田に行きたい」
    ↓
ベルボーイが自分のタブレット（または共有PC）でリアルタイム残席を確認
    ↓
残席あり・締切前であれば即予約 → QRコード表示してゲストのスマホへ案内
    ↓
満席または締切済み：「満席です。通常ハイヤーでご案内できます」+ 連絡先表示
```

> **団体ゲストの場合（シナリオ共通）：**  
> 5名以上など複数台が必要な場合はシャトルではなく**貸切ハイヤー扱い**とする。  
> アプリ上では「満席」として扱い、「団体のお客様はTMK配車センターへ直接ご連絡ください」を表示。

### 3-2. 予約の状態機械

```
[open: 空き有り]
    │
    ├─ スタッフが予約操作開始
    │       ↓
    │   [confirmed: 予約確定]
    │       │
    │       ├─ キャンセル操作
    │       │       ↓
    │       │   [cancelled: キャンセル済]
    │       │
    │       └─ 運行完了・乗車確認
    │               ↓
    │           [completed: 乗車済]
    │
    └─ 定員に達した場合
            ↓
        [full: 満席]  ── キャンセル発生 ──→ [open に戻る]

[closed: 受付終了（締切時刻超過）]
[suspended: TMK都合による運休]  ← ゼロ予約キャンセルもここ
```

### 3-3. 出発枠のステータス

| ステータス | 意味 | ホテルUIでの表示 |
|---|---|---|
| `open` | 受付中・残席あり | 緑 / 残N席 |
| `full` | 満席 | 赤 / 満席 |
| `closed` | 受付締切済（締切時刻超過） | グレー / 受付終了 |
| `suspended` | TMK都合による運休（ゼロ予約キャンセル含む） | オレンジ / 運休 |

---

## 4. 機能要件

### 4-1. ホテルUI（最重要）

#### A. 空き枠カレンダービュー（トップ画面）

- **表示範囲**：本日以降の出発枠を日付ごとにグループ表示
- **表示単位**：出発時刻ごとに1カード
- **各カードの表示内容**：
  - 出発時刻
  - 残席数（イスアイコン：青＝予約済、灰＝空き）
  - ステータス（予約する / 満席 / 受付終了）
- **リアルタイム更新**：Supabase Realtimeで他スタッフの予約が即反映

#### B. 予約入力フォーム

カードをクリックすると予約ページが開く。

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| 宿泊客名 | テキスト | ✅ | 日本語・英字どちらも可 |
| 人数 | 数値（1〜定員） | ✅ | 残席以上は選択不可 |
| フライト番号 | テキスト | ✅ | 例：NH832 |
| 荷物数 | 数値（0〜） | ✅ | 大型スーツケース換算 |
| ご予約者名 | テキスト | ✗ | ベルボーイ識別用（`booked_by_name`） |
| 備考 | テキスト（300字以内） | ✗ | 車椅子・英語対応希望など |

- **送信時の楽観的ロック**：`UPDATE shuttle_slots SET remaining_seats = remaining_seats - N WHERE id = ? AND remaining_seats >= N` で原子的処理
- **確認番号の発行**：予約成功時に `TMK-YYYYMM-XXXX` 形式の確認番号を自動生成

#### C. ゲスト確認（QRコード方式）

予約成功後、QRコードを画面に表示。ゲストが自分のスマートフォンでスキャンして確認ページを閲覧する。**紙の印刷は不要。**

**QRコードの内容：**
- QRコードは `/confirm/[confirmation_code]` の公開URLにリンク
- 認証不要でアクセス可能（ゲストはシステムアカウントを持たない）

**確認ページの表示内容：**
```
東京エムケイ シャトルハイヤー ご乗車のご案内
━━━━━━━━━━━━━━━━━━━━━━━━━━
確認番号：TMK-202606-0042
お名前　：山田 太郎 様（3名）
出発日時：2026年6月20日（土）13:00
お荷物　：スーツケース 3個
フライト：NH832

【お乗りのお車】
品川 500 あ 1234（東京MK ブランドプレート表示）
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> **v2.0追加：** 出発枠に `vehicle_plate` が設定されている場合、ゲストのチケットに乗車車両ナンバープレートを図示表示する。

#### D. 予約照会・キャンセル

- 当日・翌日・過去30日分の予約を一覧表示（自ホテル分のみ）
- 確認番号・宿泊客名・フライト番号で検索
- キャンセル操作（締切前のみ）

#### E. 満席時フロー

```
この便は満席です。
通常ハイヤーでのご案内が可能です。
東京エムケイにご連絡ください。
配車センター：03-XXXX-XXXX
```

#### F. セッション管理（共有PC対応）

- **自動タイムアウト**：無操作60分後に自動ログアウト（`hotels.session_timeout_min`）
- **タイムアウト警告**：残り5分でモーダル表示
- **再ログイン**：メール+パスワードの2フィールドのみ

---

### 4-2. TMK管理UI

#### A. ダッシュボード

- 本日・翌日の出発枠と予約埋まり率を一覧
- 月次売上サマリー（当月実績）

#### B. 出発枠管理

**単発作成：**
- 日付・出発時刻（任意時刻）・定員・車両種別・車両ナンバープレート・受付締切時刻・1席あたり単価

**枠ステータス管理：**
- `open` / `closed`（手動）の切り替え
- 締切時刻を過ぎると自動で `closed` に遷移

**ゼロ予約キャンセル確定（運休処理）：**
- 乗務員がゼロ予約通知を送信 → 管理ダッシュボードに「⚠️ キャンセル待ち」アラート
- 配車担当が「運休確定」ボタンで `suspended` に遷移

#### C. 全予約一覧

- 日付・ホテル・ステータスでフィルタ
- CSV エクスポート
- 管理者権限でのキャンセル・備考編集

#### D. 便ごとの乗車リスト

対象の出発枠を選択すると乗車リストを表示。ブラウザ印刷 / PDFダウンロード対応。

#### E. ドライバーアサイン

- 出発枠ごとにドライバーと車両を紐付け
- 社員番号（`employee_code`）・氏名で選択
- アサイン完了するとドライバーのアプリに当該便が表示される

#### F. ホテルマスター管理

- ホテル追加・編集（スーパー管理者が実施）

#### G. 月次請求レポート

- 対象月・対象ホテルを選択 → PDF出力 / CSVエクスポート
- 請求ステータス管理（未発行 / 発行済 / 入金済）

#### H. セキュリティ監視（v2.0追加）

- 認証ログ（ログイン成功・失敗）の一覧表示
- 不審IPアラート（1時間以内に3回以上ログイン失敗したIPを検出）
- アクセス元IPアドレス・UserAgent・タイムスタンプの記録

---

### 4-3. ドライバーUI（電脳交通タブレット）

#### 実装方針：電脳交通タブレット確定

| 項目 | 内容 |
|---|---|
| 端末 | 電脳交通タブレット（車載）|
| アクセス方式 | ブラウザでPWAとしてアクセス（アプリインストール不要）|
| QRスキャン | ブラウザのカメラAPIで対応可能（動作確認済み）|
| 認証 | Supabase Auth（メール+パスワード） |

#### A. 本日の担当便一覧

- ログイン後すぐに表示
- 担当便のみ表示（`driver_assignments` でフィルタ）

#### B. 乗車リスト詳細

- 便カードタップで展開
- 乗客ごとに：氏名・人数・荷物数・フライト番号・フライト情報・ターミナルバッジ
- ダークUIで視認性最大化（車内・屋外を考慮）

#### C. フライト情報表示（v2.0追加）

AviationStack APIから各乗客のフライト情報をリアルタイム取得。

| 表示項目 | 内容 |
|---|---|
| ターミナルバッジ（T1/T2） | 成田空港の到着ターミナル。フライト番号ごとに自動取得 |
| 出発時刻（予定 / 推定） | 定刻と推定出発時刻 |
| 遅延情報 | 遅延分数（+XX分）をオレンジ色で表示 |
| 遅延なし | 「✓定刻」をグリーンで表示 |

フライト情報が取得できない場合（出発数時間前・API障害時）は非表示扱いで、通常通り運行。

#### D. ターミナル自動停車順（v2.0追加）

乗客のフライト情報（ターミナル情報）が取得できた場合、**最早出発便のターミナルを先に訪問する停車順**を自動算出して表示する。

```
┌──────────────────────────────────┐
│  🛫 ターミナル停車順（自動）     │
│                                  │
│  第1停車  T2  →  第2停車  T1    │
│     3名              1名         │
│  最早出発便の順に自動ソート      │
└──────────────────────────────────┘
```

**算出ロジック：**
1. 各乗客の `flightNumber` でAviationStack APIを呼び出し、ターミナルを取得
2. ターミナルごとに乗客をグループ化
3. 各グループの最早 `scheduledDeparture` を取得
4. `scheduledDeparture` の昇順でソート → 停車順を決定

全員が同じターミナルの場合は「全員同じターミナル（T1 / T2）」と簡略表示。

#### E. 搭乗確認（QRスキャン）

1. 乗客行の「搭乗確認」ボタンをタップ
2. カメラを起動してQRコードをスキャン
3. スキャン成功 → `bookings.status = 'completed'` に更新

代替：確認番号を手入力

#### F. ステータス更新

```
[受付中]  →  [搭乗確認中]  →  [空港到着]
```

全員の搭乗確認完了後に「空港到着確認」ボタンが表示される。

#### G. ゼロ予約通知

出発時刻になっても予約がゼロの場合：
1. 「予約ゼロ・15分待機」画面を表示
2. 15分カウントダウン
3. 「配車係に通知する」ボタンをタップ → 管理側にアラート送信

---

## 5. 非機能要件

### 5-1. リアルタイム性（最重要）

複数ホテルスタッフが同時操作しても二重予約が発生しない設計。

**実装方針：**
- Supabase Realtime で残席変更をブロードキャスト
- 楽観的ロック：条件付き `UPDATE`（残席0以上のチェック付き）

### 5-2. 可用性

- 目標：99.9%（Vercel + Supabase Pro SLA）
- Vercel の CDN Edge で静的コンテンツをキャッシュ

### 5-3. セキュリティ（v2.0更新）

- **ホテル間データ完全分離**：Supabase RLS（Row Level Security）
- **認証**：Supabase Auth（メール + パスワード）
- **HTTPS**：Vercel 自動SSL
- **ロール分離**：管理者UIは `/admin`・ドライバーUIは `/driver` で別認証
- **スーパー管理者保護**：`is_super_admin` フラグ。adminClient経由のサーバーサイド検証のみ
- **認証イベントログ**：全ログイン試行を `auth_events` テーブルに記録（IP・UserAgent含む）
- **不審IP検出**：1時間以内に3回以上失敗したIPを自動フラグ → 管理画面にアラート表示
- **サービスロールキーのサーバーサイド限定使用**：`SUPABASE_SERVICE_ROLE_KEY` はServer Actions・サーバーコンポーネントのみ。クライアントに渡さない
- **APIキー保護**：全外部API（AviationStack・Booknetics等）のキーは `.env.local` / Vercel Environment Variables で管理

### 5-4. モバイル対応

- ドライバーUI：モバイルファースト（375px基準）。ダークUIで視認性最大化
- ホテルUI：タブレット対応（768px以上）
- 管理UI：PC専用（最小幅1024px）

### 5-5. 対応ブラウザ

- Chrome 最新版（全ロール必須）
- Safari（iPhone/iPad）：ドライバーUI必須
- Edge：ホテルPC環境での利用を考慮

---

## 6. DBスキーマ（Supabase PostgreSQL）

### 6-1. テーブル一覧

```
hotels                ホテルマスター
tmk_admin_users       TMK管理者アカウント（is_super_adminフラグ含む）
driver_users          ドライバーアカウント（employee_code・is_emirates_routeフラグ）
shuttle_slots         出発枠（在庫）vehicle_plate含む
bookings              予約（QR確認用confirmation_code含む）
driver_assignments    ドライバーアサイン（employee_codeブリッジキー）
auth_events           認証イベントログ（セキュリティ監視用）
route_stops           Phase 3: 複数ピックアップ停車順
monthly_invoices      月次請求サマリー
booknetics_sync_logs  Phase 4: Booknetics自動同期ログ
```

### 6-2. 詳細スキーマ

```sql
-- ホテルマスター（1ホテル1共有アカウント）
CREATE TABLE hotels (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  name_en             text,
  slug                text UNIQUE NOT NULL,
  pickup_address      text NOT NULL,
  pickup_lat          numeric(10, 7),
  pickup_lng          numeric(10, 7),
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  billing_email       text,
  auth_user_id        uuid REFERENCES auth.users(id),
  session_timeout_min int NOT NULL DEFAULT 60,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 出発枠（在庫管理の核）
-- v2.0: 出発時刻制約を撤廃（任意時刻）・vehicle_plateカラム追加
CREATE TABLE shuttle_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                date NOT NULL,
  departure_time      time NOT NULL,
  -- v2.0: CHECK制約なし（任意時刻が設定可能）
  capacity            int NOT NULL CHECK (capacity > 0),
  remaining_seats     int NOT NULL CHECK (remaining_seats >= 0),
  vehicle_type        text NOT NULL DEFAULT 'standard',
  vehicle_plate       text,   -- 車両ナンバープレート（例: 品川 500 あ 1234）。QRチケットに表示
  price_per_seat_yen  int NOT NULL DEFAULT 13500,
  cutoff_at           timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'open',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_capacity CHECK (remaining_seats <= capacity),
  CONSTRAINT valid_status CHECK (status IN ('open','full','closed','suspended'))
);
CREATE INDEX ON shuttle_slots(date, status);

-- 予約
CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text UNIQUE NOT NULL,
  slot_id           uuid NOT NULL REFERENCES shuttle_slots(id),
  hotel_id          uuid NOT NULL REFERENCES hotels(id),
  guest_name        text NOT NULL,
  party_size        int NOT NULL CHECK (party_size > 0),
  flight_number     text NOT NULL,
  luggage_count     int NOT NULL DEFAULT 0 CHECK (luggage_count >= 0),
  notes             text,
  booked_by_name    text,
  signature_url     text,
  status            text NOT NULL DEFAULT 'confirmed',
  cancelled_reason  text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  cancelled_at      timestamptz,
  completed_at      timestamptz,
  CONSTRAINT valid_booking_status CHECK (status IN ('confirmed','cancelled','completed'))
);
CREATE INDEX ON bookings(slot_id, status);
CREATE INDEX ON bookings(hotel_id, created_at DESC);

-- ドライバーアサイン
CREATE TABLE driver_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       uuid NOT NULL REFERENCES shuttle_slots(id),
  driver_id     uuid REFERENCES auth.users(id),
  employee_code text NOT NULL,
  vehicle_id    text,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  assigned_by   uuid REFERENCES auth.users(id),
  UNIQUE(slot_id)
);
CREATE INDEX ON driver_assignments(employee_code);

-- TMK管理者アカウント
-- v2.0: is_super_adminカラム追加
CREATE TABLE tmk_admin_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   text,
  is_active      boolean NOT NULL DEFAULT true,
  is_super_admin boolean NOT NULL DEFAULT false,  -- v2.0: スーパー管理者フラグ
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON tmk_admin_users(user_id);

-- ドライバーアカウント
-- employee_codeはDispatch OSとのブリッジキー（社員番号）
CREATE TABLE driver_users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code     text NOT NULL,   -- 社員番号（UIラベル：「社員番号」）
  driver_code       text,            -- 8桁ゼロ埋め社員コード（Booknetics等との連携用）
  display_name      text,
  is_emirates_route boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON driver_users(user_id);
CREATE UNIQUE INDEX ON driver_users(employee_code);

-- 認証イベントログ（v2.0追加：セキュリティ監視用）
CREATE TABLE auth_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,   -- login_success / login_failure / unauthorized_access
  user_id     uuid REFERENCES auth.users(id),
  email       text,            -- ログイン試行メール（失敗時はユーザーIDがない）
  ip_address  text,
  user_agent  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON auth_events(ip_address, created_at DESC);
CREATE INDEX ON auth_events(event_type, created_at DESC);

-- Booknetics同期ログ（Phase 4）
CREATE TABLE booknetics_sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date       date NOT NULL UNIQUE,
  emirates_count  int NOT NULL,
  slots_created   int NOT NULL DEFAULT 0,
  slots_updated   int NOT NULL DEFAULT 0,
  slots_cancelled int NOT NULL DEFAULT 0,
  hotels_notified int NOT NULL DEFAULT 0,
  raw_response    jsonb,
  error_message   text,
  synced_at       timestamptz NOT NULL DEFAULT now()
);

-- 複数ピックアップ停車順（Phase 3）
CREATE TABLE route_stops (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                 uuid NOT NULL REFERENCES shuttle_slots(id),
  hotel_id                uuid NOT NULL REFERENCES hotels(id),
  stop_order              int NOT NULL,
  scheduled_pickup_time   time NOT NULL,
  estimated_duration_min  int,
  UNIQUE(slot_id, stop_order),
  UNIQUE(slot_id, hotel_id)
);

-- 月次請求サマリー
CREATE TABLE monthly_invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES hotels(id),
  year_month       char(7) NOT NULL,
  total_bookings   int NOT NULL DEFAULT 0,
  total_seats      int NOT NULL DEFAULT 0,
  total_amount_yen int NOT NULL DEFAULT 0,
  invoice_status   text NOT NULL DEFAULT 'pending',
  issued_at        timestamptz,
  paid_at          timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, year_month)
);
```

### 6-3. 確認番号生成ロジック

```sql
-- 形式：TMK-YYYYMM-XXXX（当月の連番・4桁ゼロ埋め）
-- 例：TMK-202606-0042
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS text AS $$
DECLARE
  ym text := to_char(now(), 'YYYYMM');
  seq_name text := 'booking_seq_' || ym;
  seq_val int;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO seq_val;
  RETURN 'TMK-' || ym || '-' || lpad(seq_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## 7. RLSポリシー設計

### 7-1. 基本方針

- **hotel_staff**：自ホテルの予約のみ CRUD 可。他ホテルのデータは SELECT も不可
- **tmk_admin**：全データフルアクセス
- **driver**：担当便の shuttle_slots と bookings のみ SELECT 可
- **未認証**：全テーブルへのアクセス拒否
- **super_admin**：adminClient（サービスロール）経由でサーバーサイドのみアクセス。is_super_adminフラグをサーバーで検証後に実行

### 7-2. RLSポリシー（骨格）

```sql
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

-- ヘルパー関数: 現在のユーザーのロールを取得
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM hotels WHERE auth_user_id = auth.uid()) THEN 'hotel_staff'
      WHEN EXISTS (SELECT 1 FROM tmk_admin_users WHERE user_id = auth.uid()) THEN 'tmk_admin'
      WHEN EXISTS (SELECT 1 FROM driver_users WHERE user_id = auth.uid()) THEN 'driver'
      ELSE NULL
    END
$$ LANGUAGE sql SECURITY DEFINER;

-- ヘルパー関数: hotel_staff の所属ホテルIDを取得
CREATE OR REPLACE FUNCTION current_hotel_id()
RETURNS uuid AS $$
  SELECT id FROM hotels WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- bookings: hotel_staffは自ホテルのみ / tmk_adminは全件
CREATE POLICY hotel_staff_own_bookings ON bookings
  FOR ALL TO authenticated
  USING (
    (current_user_role() = 'hotel_staff' AND hotel_id = current_hotel_id())
    OR current_user_role() = 'tmk_admin'
  );

-- shuttle_slots: 全認証ユーザーがSELECT可 / INSERT/UPDATE/DELETEはtmk_adminのみ
CREATE POLICY read_shuttle_slots ON shuttle_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_manage_shuttle_slots ON shuttle_slots
  FOR ALL TO authenticated
  USING (current_user_role() = 'tmk_admin')
  WITH CHECK (current_user_role() = 'tmk_admin');

-- auth_events: tmk_adminのみ参照可（一般ユーザーはINSERTのみServer Action経由）
CREATE POLICY admin_read_auth_events ON auth_events
  FOR SELECT TO authenticated
  USING (current_user_role() = 'tmk_admin');
```

---

## 8. 画面一覧と遷移

### 8-1. ホテルUI 画面一覧

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| H-01 | `/hotel/login` | ログイン | メール/パスワード認証 |
| H-02 | `/hotel/calendar` | カレンダービュー（TOP） | 出発枠一覧・残席リアルタイム表示 |
| H-03 | `/hotel/book/[slotId]` | 予約入力 | 宿泊客情報入力・送信 |
| H-04 | `/hotel/book/[slotId]/confirm` | QRコード表示 | 予約完了・QRコード表示・車両ナンバー表示 |
| H-04P | `/confirm/[confirmationCode]` | ゲスト確認ページ（公開） | 認証不要・モバイル最適化・乗車案内表示 |
| H-05 | `/hotel/bookings` | 予約履歴 | 自ホテルの予約一覧・キャンセル |
| H-06 | `/hotel/bookings/[id]` | 予約詳細 | 個別予約の詳細・キャンセル |

### 8-2. TMK管理UI 画面一覧

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| A-01 | `/admin/login` | 管理者ログイン | |
| A-02 | `/admin` | ダッシュボード | 本日の枠・予約状況サマリー |
| A-03 | `/admin/slots` | 出発枠一覧 | 日別一覧・座席アイコン表示 |
| A-04 | `/admin/slots/new` | 出発枠作成 | 単発・繰り返し作成 |
| A-05 | `/admin/slots/[id]` | 出発枠詳細 | 編集・ドライバーアサイン・乗車リスト |
| A-06 | `/admin/bookings` | 全予約一覧 | フィルタ・検索・CSV出力 |
| A-07 | `/admin/bookings/[id]` | 予約詳細 | 管理者編集・キャンセル |
| A-08 | `/admin/hotels` | ホテル管理 | ホテル一覧 |
| A-09 | `/admin/invoices` | 請求管理 | 月次レポート生成・ステータス管理 |
| A-10 | `/admin/security` | セキュリティ監視（v2.0追加） | 認証ログ・不審IPアラート |

### 8-3. ドライバーUI 画面一覧

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| D-01 | `/driver/login` | ドライバーログイン | |
| D-02 | `/driver` | 本日の便一覧 | 担当便カード一覧 |
| D-03 | `/driver/slots/[id]` | 乗車リスト | 乗客一覧・フライト情報・ターミナル案内・QRスキャン |
| D-04 | `/driver/slots/[id]/notify` | ゼロ予約通知 | 15分タイマー表示・配車係への通知送信 |

### 8-4. スーパー管理者UI 画面一覧（v2.0追加）

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| SA-01 | `/admin/superadmin` | 売上ダッシュボード | KPI・月次推移・ホテル別ランキング・便別稼働率 |
| SA-02 | `/admin/superadmin/users` | ユーザー管理 | ホテル/管理者アカウントのCRUD・有効化/無効化 |

---

## 9. 技術スタック

### 9-1. 構成一覧

| レイヤー | 技術・サービス | 選定理由 |
|---|---|---|
| フロントエンド | Next.js 16 (App Router) / TypeScript / Tailwind CSS | Server Actions・RSC・ダークUIを統一スタックで実装 |
| DB | Supabase PostgreSQL | RLS・Realtime・Auth が一体 |
| リアルタイム | Supabase Realtime（PostgreSQL LISTEN/NOTIFY） | 残席同期・予約通知 |
| 認証 | Supabase Auth（メール+パスワード） | JWT にロールを紐付け |
| メール通知 | Resend | Phase 2で本格稼働（予約確認・キャンセル通知） |
| ホスティング | Vercel | GitHub連携でCI/CD自動化。本番URL確定済み |
| フライト情報 | AviationStack API（v2.0追加） | フライト出発時刻・遅延・ターミナル情報。フリープランはHTTPのみ（HTTPSは有料プラン） |
| Phase 2追加 | Supabase Edge Functions | DRアプリからの `employee_code` ベースAPI呼び出し受け口 |
| Phase 3追加 | Google Maps Directions API | 複数ホテル停車順の所要時間計算 |
| Phase 4追加 | Booknetics API（DewTouch製） | エミレーツ成田便の台数自動取得 |
| Phase 4追加 | Supabase pg_cron | 06:00 JSTの自動同期cronジョブ |

### 9-2. AviationStack API（v2.0）

| 項目 | 内容 |
|---|---|
| ベースURL | `http://api.aviationstack.com/v1/flights`（フリープランはHTTPのみ） |
| 環境変数 | `AVIATIONSTACK_API_KEY` |
| 用途 | フライト番号でフライト情報検索。`departure.terminal`・`departure.scheduled`・`departure.estimated` を取得 |
| キャッシュ | 同一フライト番号の結果は5分間キャッシュ（過剰リクエスト防止） |
| フォールバック | API障害・フライト未登録時は `null` を返し、ドライバーUIで非表示扱い |

### 9-3. 環境構成

**本番環境：**
```
Vercel（Pro）
  URL：https://shuttle-hire-platform.vercel.app
  自動SSL・GitHub連携デプロイ

Supabase（Pro）
  PostgreSQL + Realtime + Auth + Storage
```

---

## 10. 派生システム：コンシェルジュモニタープログラム

### 10-1. 位置づけと目的

シャトルハイヤー予約プラットフォームの同一Supabaseプロジェクト内で動作する派生システム。

**目的：**
- MKファン化（乗車体験による満足度向上）
- MKホットラインアプリのインストール促進
- 乗車品質のフィードバック収集

### 10-2. サービス設計

**基本コンセプト：**
- 毎月「抽選で5名まで」空港送迎を無料提供するインナーキャンペーン
- **スマート抽選**：名義上5名制限だが、実態は応募者全員にサービス提供（落選メール送信なし）

**参加条件（全て満たすこと）：**
1. 実際に飛行機に搭乗する（フライト予約確認書の提出必須）
2. 片道のみ（往復不可）
3. 同一月に2回以上の応募不可（電話番号で重複チェック）
4. MKホットラインアプリのインストール（応募前提条件）
5. 乗車後フィードバックフォームへの記入（必須）

---

## 11. フェーズ別展開計画

### Phase 1：ホテルオークラMVP ✅ 完了（2026年6月）

**実装済み機能：**
- 全3ロールUI（ホテル / 管理者 / 乗務員）
- 出発枠CRUD・予約CRUD
- QRチケット・乗車確認フロー（車両ナンバー表示付き）
- スーパー管理者UI（売上ダッシュボード + ユーザーCRUD）
- セキュリティ監視（認証イベントログ・不審IP検出）
- AviationStack API連携（フライト情報・ターミナル自動停車順）
- 本番デプロイ（`https://shuttle-hire-platform.vercel.app`）

### Phase 2：複数ホテル対応（〜3ヶ月）

**追加スコープ：**
- ホテル別精算レポート（CSV/PDF）
- ホテルUI英語対応（i18n）
- メール通知本格稼働（Resend：予約確認・キャンセル通知）
- コンシェルジュモニタープログラム実装

### Phase 2.5：Dispatch OS DRアプリ統合（DOS完成後）

**前提条件：** Dispatch OS の DRアプリが「今日」タブの実装を完了していること

**追加スコープ：**
- Supabase Edge Function：`/api/driver/slots?employee_code=XXXXXXXX`
- DRアプリ側：「今日 > シャトル便」サブメニューの追加（DOS側作業）
- `/driver/` スタンドアロンアプリは fallback として維持

### Phase 3：複数ピックアップ・ルート最適化（〜12ヶ月）

**追加スコープ：**
- 出発枠ごとの複数ホテル停車地設定
- Google Maps Directions API でルート自動計算
- `route_stops` テーブル運用開始

### Phase 4：Booknetics自動配車統合（時期未定・DOS整備後）

**概要：** エミレーツ成田便の台数をBookneticsから自動取得し、シャトル枠の生成・ドライバーアサイン・ホテル通知を完全自動化する。

詳細はSection 14参照。

---

## 12. 運用ルール確認事項

| # | 項目 | 確定内容 | ステータス |
|---|---|---|---|
| R1 | 予約締切ルール | 出発**1時間前**まで受付 | ✅ 確定 |
| R2 | キャンセルポリシー | テスト期間中はキャンセル無料 | ✅ 確定（暫定） |
| R3 | 荷物ルール | Vクラスベンツ / アルファード。大型スーツケース2個/人目安 | ✅ 確定 |
| R4 | 支払フロー | 月末締め・翌月5日請求書送付・翌月末日支払い | ✅ 確定 |
| R5 | ゲスト確認方法 | QRコード（公開確認ページ）。印刷なし。個人情報取得なし | ✅ 確定 |
| R6 | ドライバー通知タイミング | 前日20時までにアサイン確定 | ✅ 確定 |
| R7 | 満席・団体時のフロー | 「通常ハイヤーでのご案内」メッセージ + 配車センター連絡先 | ✅ 確定 |
| R8 | 精算単価 | ¥13,500/席固定（税別） | ✅ 確定 |
| R9 | スロット台数・公開ルール | デフォルト3台/日。前日17時確定後に公開 | ✅ 確定 |
| R10 | ゼロ予約キャンセルフロー | 15分待機 → 乗務員が通知 → 配車係が確定 | ✅ 確定 |

---

## 13. Dispatch OS連携ロードマップ

シャトルプラットフォームは当初 Dispatch OS とは独立したシステムとして稼働するが、MMP期以降に段階的に統合する。

### MMP期での統合マッピング

| シャトルプラットフォーム | Dispatch OS |
|---|---|
| `hotels` テーブル | `accounts`（`accountType: 'hotel'`）に吸収 |
| `shuttle_slots` | `transport_requests`（`requestType: 'shuttle'`）にマッピング |
| `bookings` | `service_orders` として受注管理 |
| `driver_assignments` | `trips`（ドライバー割り当て実行単位）に統合 |
| `monthly_invoices` | Dispatch OS の請求・精算エンジンへ移行 |

### 乗務員マスタ・車両マスタのDOS参照

- **乗務員マスタ（driver_users）**：Dispatch OSが正。シャトルHireでは表示参照のみ。新規作成・編集はDOSで行う
- **車両マスタ**：Dispatch OSが正。シャトルHireの `vehicle_id` は将来 DOS の vehicle ID に紐付く
- **パートナーマスタ**：Dispatch OSが正

---

## 14. Booknetics API統合仕様（Phase 4）

### 14-1. API概要

| 項目 | 内容 |
|---|---|
| 提供元 | DewTouch（東京MK向けカスタム開発） |
| ベースURL | `https://mktaximod.demowebsites.net` |
| 認証方式 | JWTトークン（B-1で取得、リクエストヘッダー `token: {jwt}` で送信） |

### 14-2. 使用エンドポイント

**B-1: トークン生成**
```
POST /api/mktaxi/app/token
Content-Type: application/x-www-form-urlencoded
username={BOOKNETICS_USERNAME}&password={BOOKNETICS_PASSWORD}
→ { success: true, token: "xxxx..." }
```

**B-2: 予約一覧取得（ドライバー別）**
```
GET /api/mktaxi/app/booking
Headers: token: {jwt}
Params: employeeCode={8桁社員コード}&Date={YYYY-MM-DD}&hour=24
```

### 14-3. Emirates成田便の識別ロジック

```typescript
function isNaritaJob(booking: BookneticsBooking): boolean {
  const addr = booking.toAddress?.toLowerCase() ?? '';
  const lat = booking.toAddressInfo?.latitude ?? 0;
  if (addr.includes('成田') || addr.includes('narita') || addr.includes('nrt')) return true;
  if (lat >= 35.70 && lat <= 35.80) return true;  // 座標フォールバック
  return false;
}
```

### 14-4. シャトル枠自動生成ロジック

```typescript
function calculateShuttleSlots(emiratesCount: number): ShuttleSlotPlan[] {
  const slotCount = Math.ceil(emiratesCount / 4); // 1便4席
  if (slotCount === 0) return [];
  // 11:00〜15:00の範囲で等間隔配置
  const windowMinutes = 4 * 60;
  const intervalMinutes = slotCount > 1 ? windowMinutes / (slotCount - 1) : 0;
  const baseTime = 11 * 60;
  return Array.from({ length: slotCount }, (_, i) => {
    const totalMinutes = baseTime + Math.round(i * intervalMinutes);
    return {
      departure_time: `${String(Math.floor(totalMinutes/60)).padStart(2,'0')}:${String(totalMinutes%60).padStart(2,'0')}`,
      capacity: 4,
      price_per_seat_yen: 13500,
    };
  });
}
```

---

## 15. 用語定義

| 用語 | 定義 |
|---|---|
| 出発枠（シャトルスロット） | 特定日時・定員・ルートで設定された1便の空き在庫単位 |
| 残席 | 出発枠の定員から確定予約の合計人数を引いた数 |
| 乗車リスト | 1便の全予約者リスト（ドライバー持参・TMK管理用） |
| 確認票 | 宿泊客に表示するQRチケット（デジタル・印刷不要） |
| 後請求 | 乗車実績をまとめてホテルに月次請求する支払方式 |
| 社員番号 | ドライバーの識別番号（UIラベル。Dispatch OSとのブリッジキー） |
| is_super_admin | TMK管理者アカウントに付与するフラグ。スーパー管理者機能へのアクセス権 |
| スマート抽選 | 名義上5名制限・実態は全員当選のキャンペーン設計 |
| B2B設計 | ゲスト本人はシステムにアクセスせず、ホテルが代理操作する設計原則 |

---

## 16. スーパー管理者機能仕様（v2.0追加）

### 16-1. 概要

`is_super_admin` フラグが付与されたTMK管理者アカウントのみアクセス可能な管理機能。通常のTMK管理者（`tmk_admin`）が持つ権限に加え、以下を実行できる。

| 機能 | 内容 |
|---|---|
| ユーザーCRUD | ホテルアカウント・管理者アカウントの作成・有効化/無効化 |
| 売上ダッシュボード | 月次売上推移・ホテル別予約ランキング・便別稼働率 |
| パスワードリセット | 任意ユーザーのパスワードリセットリンク発行 |

> **乗務員マスタはDOSが正。** スーパー管理者画面でのドライバー新規作成ボタンはなし（一覧参照のみ）。

### 16-2. アクセス制御

```typescript
// app/actions/superadmin.ts
async function verifySuperAdmin(): Promise<User | null> {
  const adminClient = createAdminClient()
  const { data: { user } } = await adminClient.auth.getUser(/* session token */)
  if (!user) return null
  const { data } = await adminClient
    .from('tmk_admin_users')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single()
  const isSuperAdmin = !!(data as { is_super_admin?: boolean } | null)?.is_super_admin
  return isSuperAdmin ? user : null
}
```

**認証フロー：**
1. `/admin/superadmin/layout.tsx` でサーバーサイドに `verifySuperAdmin()` を呼び出し
2. `false` の場合は `/admin` にリダイレクト
3. 全Server Actionsの冒頭でも `verifySuperAdmin()` を呼び出してロール検証

### 16-3. 売上ダッシュボード仕様

**KPIカード（4つ）：**

| KPI | 算出式 |
|---|---|
| 今月の予約数 | 当月の `bookings` レコード数（`status != 'cancelled'`） |
| 今月の推定売上 | `SUM(party_size × price_per_seat_yen)` |
| 今月の平均稼働率 | `AVG((capacity - remaining_seats) / capacity) × 100` |
| アクティブユーザー | `is_active = true` のホテル数 / ドライバー数 / 管理者数 |

**月次推移チャート：**
- 過去6ヶ月の予約数・推定売上を月別集計
- CSS バーチャート（外部ライブラリ不使用）

**ホテル別予約ランキング：**
- 当月の `bookings.hotel_id` 別件数を集計・降順ソート
- バーグラフで比率を視覚化

**便別稼働率：**
- 当月の全 `shuttle_slots` の `(capacity - remaining_seats) / capacity`
- 90%以上：赤、60〜89%：オレンジ、60%未満：青

### 16-4. ユーザー管理仕様

#### ホテルアカウント作成（Server Action）

```typescript
// createHotelAccount
// 1. adminClient.auth.admin.createUser({ email, password })
// 2. adminClient.from('hotels').insert({ name, auth_user_id, pickup_address, ... })
```

#### 管理者アカウント作成（Server Action）

```typescript
// createTmkAdminAccount
// 1. adminClient.auth.admin.createUser({ email, password })
// 2. adminClient.from('tmk_admin_users').insert({ user_id, display_name, is_super_admin })
```

#### 有効化/無効化

- `hotels.is_active` / `driver_users.is_active` / `tmk_admin_users.is_active` を `true/false` でトグル
- Supabase Authアカウントのban設定と連動（将来実装）

### 16-5. DBマイグレーション

```sql
-- 20260618000005_add_super_admin_flag.sql
ALTER TABLE tmk_admin_users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;
```
