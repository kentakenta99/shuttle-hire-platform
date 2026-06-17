# MKシャトルハイヤー予約プラットフォーム
## 要件定義＋仕様書

**ステータス：** 要件定義確定版  
**バージョン：** 1.4  
**作成者：** 八木健太  
**作成日：** 2026年5月  
**上書き対象：** `05_shuttle_proposal.md` / `05b_shuttle_technical_requirements.md` / `requirements/05_shuttle.md`

> **v1.4 変更内容（2026-06-17）：**
> - **内部コンテキストを分離**：エミレーツ関連の内部目標を `docs/internal/internal_business_context.md` へ移動。本文書はホテル共有可能な内容のみ記載
> - **スロット運用ルール確定**：デフォルト3台/日・前日17時に増減確定・前日17時以降にスロット公開（R9追加）
> - **ゼロ予約キャンセルフロー確定**：出発時ゼロ → 15分待機 → 乗務員が配車係に通知 → 配車係がキャンセル確定（R10追加）
> - **団体案件のスコープ外確定**：満席表示 + TMK連絡先のみ。アプリ内チャーターフローなし
> - **乗務員UI確定**：電脳交通タブレット（ブラウザPWA）での動作確認済み。QRスキャン対応
> - **受注タイミング4パターン確定**：チェックイン時 / 前夜 / 当日朝 / チェックアウト時
> - **スキーマ追加**：`bookings.booked_by_name`（ベルボーイ識別用）
> - **ステータス修正**：`shuttle_slots.status` の `cancelled` → `suspended`（v1.3以降の統一）
> - **R6更新**：スロット台数確定タイミングを「当日8時」から「前日17時」に修正
>
> **v1.3 変更内容（2026-05-13）：**  
> - **Phase 4追加**：Booknetics API統合による自動配車（エミレーツ成田便カウント → シャトル枠自動生成 → ホテル通知）
> - `driver_users.is_emirates_route` フラグ追加
> - `booknetics_sync_logs` テーブル追加
> - Section 14 新設：Booknetics API統合仕様（認証・フィルタロジック・シャトル枠算出・DewTouch依頼事項）
> - Section 9 技術スタックにBooknetics API / pg_cron を追加
>
> **v1.2 変更内容（2026-05-13）：**  
> - R1〜R8 全運用ルール確定（締切1時間前・¥13,500固定・月末締め翌月5日請求・テスト期間キャンセル無料）  
> - ゲスト確認方式：印刷廃止 → QRコード＋公開確認ページ・電子署名に変更  
> - エミレーツ片送り解消施策としての背景コンテキスト追記  
> - 出発枠制約（11:00〜15:00）をDBレベルで定義  
> - `tmk_admin_users` / `driver_users` テーブル定義追加  
> - 満席時フロー（通常ハイヤー案内）を機能要件に追記  
>
> **v1.1 変更内容（2026-05-13）：**  
> - **M-2 確定**：ホテル認証方式 → 共有PC方式（フロント固定ログイン、1ホテル1アカウント）。`hotel_staff_users` テーブル廃止。`hotels.auth_user_id` で認証  
> - **M-3 確定**：ドライバーUI → Dispatch OS DRアプリ統合方針。Phase 1はスタンドアロン `/driver/`、Phase 2はDRアプリ「今日」タブのサブメニューとして統合。`employee_code` をブリッジキーとして設計段階から組み込み

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
12. [運用ルール確認事項（開発着手前必須）](#12-運用ルール確認事項開発着手前必須)
13. [Dispatch OS連携ロードマップ](#13-dispatch-os連携ロードマップ)
14. [Booknetics API統合仕様（Phase 4）](#14-booknetics-api統合仕様phase-4)
15. [用語定義](#15-用語定義)

---

## 1. プロジェクト概要

### 1-1. システム名

**MKシャトルハイヤー予約プラットフォーム**  
ドメイン（仮）：`shuttle.tokyomk.com`

### 1-2. 目的

ホテルフロント・ベルデスクが成田空港行きシャトルハイヤーの空き枠をリアルタイムで確認し、TMKへの電話・折り返しゼロで予約を完結させるB2B予約システム。

### 1-3. 背景と課題

#### 背景と課題

ホテルに宿泊中のゲストが成田空港へ向かう際、現状は電話でTMKに問い合わせるしかなく、双方に対応コストが発生している。また空き状況がリアルタイムで把握できないため、案内のタイミングを逃すケースも多い。

本システムはこの課題を解決し、**ホテルスタッフが即座に空き確認・予約完結できる環境**を提供する。

**スロット運用方針：**
- **デフォルト台数**：3台/日を基本とし、前日17時に増減を確定
- **スロット公開タイミング**：前日17時以降にスロットを `open` にする（それ以前は非公開）
- **出発枠**：11:00〜15:00の範囲内で設定
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
- 複数ホテルに展開したとき、電話管理が破綻する

#### 解決後のフロー
```
ホテルスタッフ → ブラウザで空き枠カレンダーを開く
    ↓
空き枠をクリック → 宿泊客情報を入力（30秒）
    ↓
確認票を印刷 → ゲストに手渡す（完結）
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
- マニュアル運用にて試験稼働中（システム化前の並行期間）

### 1-6. 既存アセット

`narita-shuttle-v2`（SQLiteプロトタイプ）に以下の設計資産が存在する。本番開発ではスキーマ設計の参考として活用するが、**コードは流用しない（Supabase対応でゼロから実装）**。

---

## 2. ステークホルダーと3ロール定義

### 2-1. ロール一覧

| ロールID | 名称 | 人数規模 | 主な操作 | 利用端末 | 接続環境 |
|---|---|---|---|---|---|
| `hotel_staff` | ホテル共有アカウント（フロントPC固定ログイン。1ホテル1アカウント） | 共有PC 1台（複数スタッフが交代利用） | 空き確認・予約入力・確認票印刷・予約照会/キャンセル | フロント共有デスクトップPC | ホテル有線LAN |
| `tmk_admin` | TMK管理者（運行担当） | 1〜3名 | 出発枠管理・全予約管理・乗車リスト・ドライバーアサイン・請求レポート | PC | オフィス有線LAN |
| `driver` | TMKドライバー | 1〜3名/便 | 担当便の乗車リスト確認・ステータス更新 | スマートフォン | LTE（移動中） |

### 2-2. ゲストの位置づけ

ゲスト（宿泊客）はシステムに**直接アクセスしない**。ホテルスタッフが代理入力し、ゲストには印刷した確認票を手渡す。これはB2B設計の最重要原則。

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
確認票を印刷 → ゲストに手渡す
```

#### シナリオB：前日案内（ベルデスクから）
```
ゲストが翌朝の出発について相談
    ↓
システムで当日の残席を確認（空いているか判断）
    ↓
席を押さえる → 確認票を再発行
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
> アプリ内に貸切予約フローは持たない。

### 3-2. 予約の状態機械

```
[open: 空き有り]
    │
    ├─ スタッフが予約操作開始
    │       ↓
    │   [仮ロック中（最大30秒）]  ← 他スタッフはその席数を「仮押さえ中」として表示
    │       ↓ 送信成功             ↓ タイムアウト or 操作離脱
    │   [confirmed: 予約確定]      [open に戻る]
    │       │
    │       ├─ キャンセル操作
    │       │       ↓
    │       │   [cancelled: キャンセル済]
    │       │
    │       └─ 運行完了
    │               ↓
    │           [completed: 乗車済]
    │
    └─ 定員に達した場合
            ↓
        [full: 満席]  ── キャンセル発生 ──→ [open に戻る]

[closed: 受付終了（締切時刻超過）]
[suspended: TMK都合による運休]  ← ゼロ予約キャンセルもここ。乗客キャンセル(bookings.cancelled)とは別概念
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

- **表示範囲**：デフォルト「本日＋翌日」。日付タブで最大7日先まで切り替え可能
- **表示単位**：出発時刻ごとに1カード
- **各カードの表示内容**：
  - 出発時刻（例：07:30）
  - 車両種別（スタンダードハイヤー / プレミアムハイヤー）
  - 残席数（数字 + バーグラフ）
  - ステータス色（緑/赤/グレー）
- **リアルタイム更新**：Supabase Realtimeで他スタッフの予約が即反映。残席が変わったカードは一瞬フラッシュ表示
- **仮ロック表示**：他スタッフが予約操作中の席数は「操作中」として差し引いた残席を表示

#### B. 予約入力フォーム

カードをクリックするとモーダルまたは専用ページで入力フォームが開く。

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| 宿泊客名 | テキスト | ✅ | 日本語・英字どちらも可。複数名の場合は代表者名 |
| 人数 | 数値（1〜定員） | ✅ | 残席以上は選択不可（UI制御） |
| フライト番号 | テキスト | ✅ | 例：NH832 |
| 荷物数 | 数値（0〜） | ✅ | 大型スーツケース換算 |
| 備考 | テキスト（300字以内） | ✗ | 車椅子・英語対応希望など |

- **入力中のリアルタイム監視**：フォームを開いている間も残席を監視。他スタッフに取られた場合は「残席が変わりました。確認してください」と警告を表示
- **送信時の楽観的ロック**：`UPDATE shuttle_slots SET remaining_seats = remaining_seats - N WHERE id = ? AND remaining_seats >= N` で原子的に処理。取得件数0なら「申し訳ありません。ちょうど満席になりました」エラー
- **確認番号の発行**：予約成功時に `TMK-YYYYMM-XXXX` 形式の確認番号を自動生成

#### C. ゲスト確認（QRコード方式・印刷なし）

予約成功後、QRコードをスタッフの画面に表示。ゲストが自分のスマートフォンでスキャンして確認ページを閲覧する。**紙の印刷は不要。**

**QRコードの動作：**
- QRコードは `shuttle.tokyomk.com/confirm/[confirmation_code]` の公開URLにリンク
- 認証不要でアクセス可能（ゲストはシステムアカウントを持たない）
- ゲストのメールアドレス・電話番号は取得しない（ホテルとのプライバシー配慮）

**確認ページの表示内容（モバイル最適化）：**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━
  東京MK シャトルハイヤー ご乗車のご案内
━━━━━━━━━━━━━━━━━━━━━━━━━━
確認番号：TMK-202606-0042
お名前　：山田 太郎 様（3名）
出発日時：2026年6月20日（土）13:00
出発場所：ホテルオークラ東京 玄関前
行　　先：成田国際空港
フライト：NH832
お荷物　：スーツケース 3個

【当日のお問い合わせ】
東京エムケイ 配車センター：03-XXXX-XXXX
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**代替手段（電子署名）：**
QRスキャンが難しい場合、フロントのタブレット画面上でゲストに電子署名してもらう。署名画像は予約レコードに紐付けて保存（Supabase Storage）。

#### D. 予約照会・キャンセル

- 当日・翌日・過去30日分の予約を一覧表示（自ホテル分のみ）
- 確認番号・宿泊客名・フライト番号で検索
- キャンセル操作（締切前のみ・ポリシーはR2による）
- キャンセル後は残席に即時反映

#### E-2. 満席時フロー

空き枠が0になった場合（または `full` ステータス）のホテルUIの表示：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━
  この便は満席です
━━━━━━━━━━━━━━━━━━━━━━━━━━
通常ハイヤーでのご案内が可能です。
東京エムケイにご連絡ください。
（特別割引料金にてご対応いたします）

配車センター：03-XXXX-XXXX
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- 予約ボタンは非活性化（クリック不可）
- 通常ハイヤーへの誘導メッセージを表示

#### E. セッション管理（共有PC対応）

フロント共有PCを前提とした安全なセッション設計：

- **セッションストレージ**：認証状態は `localStorage` ではなく `sessionStorage` に格納。タブを閉じると自動的にログアウト
- **自動タイムアウト**：無操作X分後に自動ログアウト（`hotels.session_timeout_min` で設定、デフォルト60分）
- **タイムアウト警告**：残り5分でモーダル表示「まもなくログアウトします。続行しますか？」
- **再ログイン**：ホテルIDとパスワードの2フィールドのみのシンプルなログイン画面（H-01）

#### F. 言語対応

- Phase 1：日本語のみ
- Phase 2：英語UI追加（画面右上で切り替え）

---

### 4-2. TMK管理UI

#### A. ダッシュボード

- 本日・翌日の出発枠と予約埋まり率を一覧
- 直近キャンセル・新規予約の通知ログ
- 月次売上サマリー（当月実績）

#### B. 出発枠管理

**単発作成：**
- 日付・出発時刻・定員・車両種別（スタンダード/プレミアム）・受付締切時刻・1席あたり単価（請求用）

**一括作成（繰り返し設定）：**
- 開始日・終了日・曜日指定（例：月〜金）・時刻・定員を一括登録
- 祝日スキップオプション

**編集・削除：**
- 予約が入っている枠は定員を現在予約数以下に下げられない（バリデーション）
- キャンセル操作時：予約済みスタッフへの通知メール自動送信（Resend）

**枠ステータス管理：**
- `open` / `closed`（手動）の切り替え
- 締切時刻を過ぎると自動で `closed` に遷移（定期Job または Supabase Edge Function）

**ゼロ予約キャンセル確定（運休処理）：**
- 乗務員がゼロ予約通知を送信すると、管理ダッシュボードに「⚠️ キャンセル待ち」アラートが表示される
- 配車担当が内容を確認し「運休確定」ボタンを押すことで `suspended` に遷移
- 運休確定後：予約済みのホテルへResendで通知メール自動送信（既存予約がある場合のみ）
- キャンセル待ち状態では乗務員に「待機中」が表示される（15分タイマー表示）

#### C. 全予約一覧

- 日付・ホテル・ステータスでフィルタ
- 一覧表示：確認番号 / 宿泊客名 / ホテル / 出発時刻 / 人数 / 荷物 / フライト番号 / ステータス
- 管理者権限でのキャンセル・備考編集
- CSV エクスポート

#### D. 便ごとの乗車リスト

対象の出発枠を選択すると乗車リストを表示。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  乗車リスト  2026年6月20日 07:30発
  車両：スタンダードハイヤー  担当：鈴木ドライバー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No. | 氏名           | 人数 | 荷物 | フライト  | ホテル
  1 | 山田 太郎      |   3  |   3  | NH832    | オークラ
  2 | SMITH, John    |   1  |   2  | JL714    | オークラ
  3 | 鈴木 花子      |   2  |   1  | AA150    | オークラ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
合計：3件 / 6名 / 荷物6個
```

- ブラウザ印刷 / PDFダウンロード（print CSS）

#### E. ドライバーアサイン

- 出発枠ごとにドライバーと車両を紐付け
- アサイン完了するとドライバーのアプリに当該便が表示される
- アサイン後の変更は管理者のみ可

#### F. ホテルマスター管理（Phase 2）

- ホテル追加・編集（名称・slug・住所・座標・請求先・担当者連絡先）
- ホテル共有アカウントのパスワードリセット（`hotels.auth_user_id` に紐付く Supabase Auth アカウント）
- 自動ログアウト時間の設定（`session_timeout_min`）
- ホテルごとの稼働統計（月次利用実績）

#### G. 月次請求レポート

- 対象月・対象ホテルを選択
- 出力内容：日付 / 便 / 乗客名 / 人数 / 単価 / 小計
- 合計金額を自動計算
- PDF出力 / CSVエクスポート
- 請求ステータス管理（未発行 / 発行済 / 入金済）

---

### 4-3. ドライバーUI（電脳交通タブレット）

#### 実装方針：電脳交通タブレット確定

**Phase 1の乗務員UI端末は電脳交通タブレットに決定。**

| 項目 | 内容 |
|---|---|
| 端末 | 電脳交通タブレット（車載）|
| アクセス方式 | ブラウザでPWAとしてアクセス（アプリインストール不要）|
| QRスキャン | ブラウザのカメラAPIで対応可能（動作確認済み）|
| 認証 | Supabase Auth（メール+パスワード） |

**2フェーズ展開：**

| | Phase 1（スタンドアロン） | Phase 2（DRアプリ統合） |
|---|---|---|
| 実装形態 | `/driver/` スタンドアロンWebアプリ（電脳交通タブレットのブラウザで動作） | Dispatch OS DRアプリ「今日」タブの「シャトル便」サブメニュー |
| 認証 | Supabase Auth（メール+パスワード） | DRアプリの Firebase Auth / LINE WORKS OIDC |
| データアクセス | Supabase クライアント直接 | Supabase Edge Function API 経由 |
| ブリッジキー | `employee_code`（設計時点から組み込み） | `employee_code` でDRアプリ ↔ シャトルDBを接続 |

**DRアプリ統合アーキテクチャ（Phase 2）：**
```
DRアプリ（Firebase Auth / LINE WORKS OIDC）
  ↓ 「今日 > シャトル便」メニュータップ
  GET /api/driver/slots?employee_code=00012345
  （Supabase Edge Function）
  ↓ employee_code で driver_assignments を検索
  担当シャトルスロット + 乗客リストを返す
```

#### A. 本日の担当便一覧

- ログイン後すぐに表示（ダッシュボード不要）
- 担当便のみ表示（`driver_assignments.employee_code` でフィルタ）
- 各便カード：出発時刻・ピックアップ場所・乗客人数・ステータス

#### B. 乗車リスト詳細

- 便カードタップで展開
- 乗客ごとに：氏名・人数・荷物数・フライト番号
- コンパクト表示（スマホ画面に全員が収まるデザイン）

#### C. ステータス更新

```
[出発前確認]  →  [ピックアップ完了]  →  [空港到着]
```

- 各ステータス変更で更新時刻を記録
- TMK管理者のダッシュボードにリアルタイム反映

#### D. ゼロ予約通知（キャンセル待ち）

出発時刻になっても予約がゼロの場合：

```
出発時刻到達 → 乗務員が「予約ゼロ・15分待機」画面を確認
    ↓（15分カウントダウン表示）
「配車係に通知する」ボタンをタップ
    ↓
TMK管理UIに「⚠️ キャンセル待ち」アラート送信
    ↓（配車係が確認・運休確定）
乗務員側に「運休確定」または「出発してください」の応答が届く
```

- 15分タイマーは乗務員端末に表示（自動送信はしない。乗務員の判断でボタンを押す）
- ギリギリ予約が入った場合はタイマーをキャンセルして通常フローへ戻る

#### E. Phase 3：複数ホテル停車順表示

- ルート地図（Google Maps埋め込み）
- 各停車地のピックアップ予定時刻
- 「次の停車地へナビ」ボタン

---

## 5. 非機能要件

### 5-1. リアルタイム性（最重要）

複数ホテルスタッフが同時操作しても二重予約が発生しない設計。

**同時予約シナリオ：**
```
スタッフAが「残3席」を見て2席の予約操作を開始
            ↓（同時に）
スタッフBが「残3席」を見て2席の予約操作を開始
            ↓
Aが先にSUBMIT
→ DB: remaining_seats 3→1（成功）
→ Aに「予約が完了しました」

Bが0.1秒後にSUBMIT
→ DB: WHERE remaining_seats >= 2 が 1 のため条件不成立
→ Bに「申し訳ありません。ちょうど満席になりました」
```

**実装方針：**
- Supabase Realtime で残席変更をブロードキャスト
- 楽観的ロック：条件付き `UPDATE`（行ロックより軽量・スケーラブル）
- 仮ロック（オプション）：Supabase presence を使ったソフトロック（30秒タイムアウト）

### 5-2. 可用性

- 目標：99.9%（Vercel + Supabase Pro SLA）
- 運行日の朝8〜10時が最高負荷。チェックアウト時間帯集中
- Vercel の CDN Edge で静的コンテンツをキャッシュ

### 5-3. セキュリティ

- ホテル間データ完全分離：Supabase RLS（Row Level Security）
- 認証：Supabase Auth（メール + パスワード）。JWTにホテルIDとロールを埋め込む
- HTTPS：Vercel 自動SSL
- 管理者UIは `/admin` パスで別認証（tmk_admin ロールのみ）
- ドライバーUIは `/driver` パスで別認証（driver ロールのみ）

### 5-4. 印刷対応

- PDF生成ライブラリ不使用（依存ゼロ）
- `@media print` CSS で確認票・乗車リストを印刷最適化
- A4横/縦の両方に対応

### 5-5. モバイル対応

- ドライバーUI：モバイルファースト（375px基準）
- ホテルUI：タブレット対応（768px以上で快適に利用可能）
- 管理UI：PC専用（最小幅1024px）

### 5-6. 対応ブラウザ

- Chrome 最新版（全ロール必須）
- Safari（iPhone/iPad）：ドライバーUI必須
- Edge：ホテルPC環境での利用を考慮

---

## 6. DBスキーマ（Supabase PostgreSQL）

### 6-1. テーブル一覧

```
hotels                ホテルマスター（共有アカウントUID・タイムアウト設定を含む）
tmk_admin_users       TMK管理者アカウント
driver_users          ドライバーアカウント（Phase 1スタンドアロン認証用・is_emirates_routeフラグ含む）
shuttle_slots         出発枠（在庫）11:00〜15:00・¥13,500固定・運休はsuspended
bookings              予約（QR確認用confirmation_code・電子署名URLを含む）
driver_assignments    ドライバーアサイン（employee_codeブリッジキーを含む）
route_stops           Phase 3: 複数ピックアップ停車順
monthly_invoices      月次請求サマリー
booknetics_sync_logs  Phase 4: Booknetics自動同期ログ（日次cron実行記録）
```

### 6-2. 詳細スキーマ

```sql
-- ホテルマスター（1ホテル1共有アカウント）
CREATE TABLE hotels (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,               -- ホテルオークラ東京
  name_en             text,                        -- Hotel Okura Tokyo
  slug                text UNIQUE NOT NULL,        -- okura（URLに使用）
  pickup_address      text NOT NULL,              -- 〒105-0001 東京都港区虎ノ門2-10-4
  pickup_lat          numeric(10, 7),
  pickup_lng          numeric(10, 7),
  contact_name        text,                        -- 担当者名
  contact_email       text,
  contact_phone       text,
  billing_email       text,                        -- 請求書送付先
  auth_user_id        uuid REFERENCES auth.users(id),  -- 共有アカウントのSupabase Auth UID
  session_timeout_min int NOT NULL DEFAULT 60,    -- 自動ログアウト時間（分）
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 出発枠（在庫管理の核）
-- 出発時刻は11:00〜15:00の範囲内で設定（エミレーツ便連動）
CREATE TABLE shuttle_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                date NOT NULL,
  departure_time      time NOT NULL,
  -- 出発時刻は11:00〜15:00の範囲のみ許可
  CONSTRAINT valid_departure_window CHECK (
    departure_time >= '11:00:00' AND departure_time <= '15:00:00'
  ),
  capacity            int NOT NULL CHECK (capacity > 0),
  remaining_seats     int NOT NULL CHECK (remaining_seats >= 0),
  vehicle_type        text NOT NULL DEFAULT 'standard',  -- standard（Vベンツ/アルファード）
  price_per_seat_yen  int NOT NULL DEFAULT 13500,        -- 1席¥13,500固定（車種・時間帯変動なし）
  cutoff_at           timestamptz NOT NULL,              -- 受付締切日時（出発1時間前）
  status              text NOT NULL DEFAULT 'open',      -- open / full / closed / suspended
  -- suspended = TMK都合による運休（便単位）。乗客キャンセルとは別概念
  -- cancelled は使用しない（bookings.status の乗客キャンセルと混同を避けるため）
  notes               text,                              -- 管理者メモ（運休理由など）
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_capacity CHECK (remaining_seats <= capacity),
  CONSTRAINT valid_status CHECK (status IN ('open','full','closed','suspended'))
);
CREATE INDEX ON shuttle_slots(date, status);

-- 予約
CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text UNIQUE NOT NULL,     -- TMK-202606-XXXX（QRコードのURLキーを兼ねる）
  slot_id           uuid NOT NULL REFERENCES shuttle_slots(id),
  hotel_id          uuid NOT NULL REFERENCES hotels(id),
  guest_name        text NOT NULL,
  party_size        int NOT NULL CHECK (party_size > 0),
  flight_number     text NOT NULL,
  luggage_count     int NOT NULL DEFAULT 0 CHECK (luggage_count >= 0),
  -- 荷物の目安: 大型スーツケース2個/人。4名の場合最大8個程度
  notes             text,
  booked_by_name    text,                     -- 予約したベルボーイ・スタッフ名（任意。1ホテル1アカウントでの個人識別用）
  signature_url     text,                     -- 電子署名画像（Supabase Storage URL）
  status            text NOT NULL DEFAULT 'confirmed',  -- confirmed / cancelled / completed
  -- cancelled = 乗客都合によるキャンセル（Dispatch OS Service Order の cancelled に対応）
  -- 便全体の運休は shuttle_slots.status = 'suspended' で管理（こちらとは別レイヤー）
  cancelled_reason  text,
  created_by        uuid REFERENCES auth.users(id),     -- ホテル共有アカウントのuser_id
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
  driver_id     uuid REFERENCES auth.users(id),   -- Phase 1: Supabase Auth UID（スタンドアロン時）
  employee_code text NOT NULL,                    -- 8桁社員コード（Dispatch OSとのブリッジキー）
  vehicle_id    text,                              -- 車両番号（Dispatch OS連携前は手入力）
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  assigned_by   uuid REFERENCES auth.users(id),
  UNIQUE(slot_id)                                 -- 1便に1ドライバー
);
CREATE INDEX ON driver_assignments(employee_code);

-- TMK管理者アカウント
CREATE TABLE tmk_admin_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON tmk_admin_users(user_id);

-- ドライバーアカウント（Phase 1: スタンドアロン認証用）
-- Phase 2以降はDRアプリのFirebase Authに移行するが、employee_codeで継続連携
CREATE TABLE driver_users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code     text NOT NULL,  -- 8桁社員コード（Dispatch OSとのブリッジキー）
  display_name      text,
  is_emirates_route boolean NOT NULL DEFAULT false,  -- Phase 4: エミレーツ成田ルート担当フラグ
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON driver_users(user_id);
CREATE UNIQUE INDEX ON driver_users(employee_code);
CREATE INDEX ON driver_users(is_emirates_route, is_active);  -- Phase 4 cronクエリ用

-- Booknetics同期ログ（Phase 4: 自動配車cron実行記録）
CREATE TABLE booknetics_sync_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date      date NOT NULL UNIQUE,
  emirates_count int NOT NULL,           -- Booknetics APIから取得した成田便台数
  slots_created  int NOT NULL DEFAULT 0, -- 新規生成した shuttle_slots 数
  slots_updated  int NOT NULL DEFAULT 0, -- 更新した shuttle_slots 数
  slots_cancelled int NOT NULL DEFAULT 0,-- キャンセルした shuttle_slots 数
  hotels_notified int NOT NULL DEFAULT 0,-- メール送信したホテル数
  raw_response   jsonb,                  -- Booknetics APIレスポンス（デバッグ用）
  error_message  text,                   -- エラー時のメッセージ
  synced_at      timestamptz NOT NULL DEFAULT now()
);

-- 複数ピックアップ停車順（Phase 3）
CREATE TABLE route_stops (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                 uuid NOT NULL REFERENCES shuttle_slots(id),
  hotel_id                uuid NOT NULL REFERENCES hotels(id),
  stop_order              int NOT NULL,          -- 停車順（1始まり）
  scheduled_pickup_time   time NOT NULL,
  estimated_duration_min  int,                   -- 前停車地からの所要時間
  UNIQUE(slot_id, stop_order),
  UNIQUE(slot_id, hotel_id)
);

-- 月次請求サマリー
CREATE TABLE monthly_invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES hotels(id),
  year_month       char(7) NOT NULL,             -- YYYY-MM 形式（例：2026-06）
  total_bookings   int NOT NULL DEFAULT 0,
  total_seats      int NOT NULL DEFAULT 0,
  total_amount_yen int NOT NULL DEFAULT 0,
  invoice_status   text NOT NULL DEFAULT 'pending',  -- pending / issued / paid
  issued_at        timestamptz,
  paid_at          timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, year_month)
);
```

### 6-3. 確認番号生成ロジック

```sql
-- Supabase Edge Function または DB Function で生成
-- 形式：TMK-YYYYMM-XXXX（XXXXは当月の連番・4桁ゼロ埋め）
-- 例：TMK-202606-0042
CREATE SEQUENCE booking_seq_202606 START 1;  -- 月ごとに生成

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

### 7-2. RLSポリシー（骨格）

```sql
-- RLSを全テーブルで有効化
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;

-- ヘルパー関数: 現在のユーザーのロールを取得
-- hotel_staff は hotels.auth_user_id で判定（hotel_staff_users テーブルなし）
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

-- ヘルパー関数: hotel_staff の所属ホテルIDを取得（hotels直接参照）
CREATE OR REPLACE FUNCTION current_hotel_id()
RETURNS uuid AS $$
  SELECT id FROM hotels WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- bookings: hotel_staffは自ホテルのみ / tmk_adminは全件 / driverは参照のみ
CREATE POLICY hotel_staff_own_bookings ON bookings
  FOR ALL TO authenticated
  USING (
    (current_user_role() = 'hotel_staff' AND hotel_id = current_hotel_id())
    OR current_user_role() = 'tmk_admin'
  );

CREATE POLICY driver_read_assigned_bookings ON bookings
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'driver'
    AND slot_id IN (
      SELECT slot_id FROM driver_assignments WHERE driver_id = auth.uid()
    )
  );

-- shuttle_slots: 全認証ユーザーがSELECT可 / INSERT/UPDATE/DELETEはtmk_adminのみ
CREATE POLICY read_shuttle_slots ON shuttle_slots
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY admin_manage_shuttle_slots ON shuttle_slots
  FOR ALL TO authenticated
  USING (current_user_role() = 'tmk_admin')
  WITH CHECK (current_user_role() = 'tmk_admin');
```

---

## 8. 画面一覧と遷移

### 8-1. ホテルUI 画面一覧

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| H-01 | `/login` | ログイン | メール/パスワード認証 |
| H-02 | `/` | カレンダービュー（TOP） | 出発枠一覧・残席リアルタイム表示 |
| H-03 | `/book/[slotId]` | 予約入力 | 宿泊客情報入力・送信 |
| H-04 | `/book/[slotId]/confirm` | QRコード表示 | 予約完了・QRコード表示（ゲストがスキャン）・電子署名入力 |
| H-04P | `/confirm/[confirmationCode]` | ゲスト確認ページ（公開） | 認証不要・モバイル最適化・乗車案内表示 |
| H-05 | `/bookings` | 予約履歴 | 自ホテルの予約一覧・キャンセル |
| H-06 | `/bookings/[id]` | 予約詳細 | 個別予約の詳細・再印刷・キャンセル |

### 8-2. TMK管理UI 画面一覧

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| A-01 | `/admin/login` | 管理者ログイン | |
| A-02 | `/admin` | ダッシュボード | 本日の枠・予約状況サマリー |
| A-03 | `/admin/slots` | 出発枠一覧 | 日別カレンダー表示 |
| A-04 | `/admin/slots/new` | 出発枠作成 | 単発・繰り返し作成 |
| A-05 | `/admin/slots/[id]` | 出発枠詳細 | 編集・ドライバーアサイン・乗車リスト |
| A-06 | `/admin/bookings` | 全予約一覧 | フィルタ・検索・CSV出力 |
| A-07 | `/admin/bookings/[id]` | 予約詳細 | 管理者編集・キャンセル |
| A-08 | `/admin/hotels` | ホテル管理 | ホテル一覧・追加（Phase 2） |
| A-09 | `/admin/invoices` | 請求管理 | 月次レポート生成・ステータス管理 |

### 8-3. ドライバーUI 画面一覧

| 画面ID | パス | 画面名 | 主な機能 |
|---|---|---|---|
| D-01 | `/driver/login` | ドライバーログイン | |
| D-02 | `/driver` | 本日の便一覧 | 担当便カード一覧 |
| D-03 | `/driver/slots/[id]` | 乗車リスト | 乗客一覧・ステータス更新・QRスキャン |
| D-04 | `/driver/slots/[id]/notify` | ゼロ予約通知 | 15分タイマー表示・配車係への通知送信 |

---

## 9. 技術スタック

### 9-1. 構成一覧

| レイヤー | 技術・サービス | 選定理由 |
|---|---|---|
| フロントエンド | Next.js 15 (App Router) / TypeScript / Tailwind CSS | TMK標準スタック。RSC + SSR でリアルタイム性と印刷対応を両立 |
| DB | Supabase PostgreSQL | RLS・Realtime・Auth が一体。残席の原子的更新に最適 |
| リアルタイム | Supabase Realtime（PostgreSQL LISTEN/NOTIFY） | 残席同期・予約通知 |
| 認証 | Supabase Auth（メール+パスワード） | JWT にホテルID・ロールを埋め込み |
| メール通知 | Resend | 既存プロジェクト（dispatch-os-interviewer）で実績あり |
| ホスティング | Vercel | TMK標準・GitHub連携でCI/CD自動化 |
| Phase 2追加 | Supabase Edge Functions（APIエンドポイント） | DRアプリからの `employee_code` ベースAPI呼び出し受け口 |
| Phase 3追加 | Google Maps Directions API | 複数ホテル停車順の所要時間計算 |
| Phase 4追加 | Booknetics API（DewTouch製） | エミレーツ成田便の台数自動取得。`POST /token` → JWT、`GET /booking?employeeCode=&Date=` で成田便フィルタ |
| Phase 4追加 | Supabase pg_cron | 06:00 JSTの自動同期cronジョブ実行（Edge Functionトリガー） |

### 9-2. 環境構成

**開発環境：**
```
Node.js 20+
Next.js 15（App Router）
TypeScript 5+
Tailwind CSS 4
pnpm
Supabase CLI（ローカル開発）
```

**本番環境：**
```
Vercel（Pro）
  ドメイン：shuttle.tokyomk.com
  自動SSL・GitHub連携デプロイ

Supabase（Pro：$25/月）
  PostgreSQL + Realtime + Auth + Storage
```

**月額ランニングコスト（概算）：**

| サービス | プラン | 月額 |
|---|---|---|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| Resend | Pro（Phase 1は無料枠内） | $0〜$20 |
| Google Maps（Phase 3〜） | 従量課金 | 〜$50 |
| **合計** | | **$45〜$115/月** |

---

## 10. 派生システム：コンシェルジュモニタープログラム

### 10-1. 位置づけと目的

シャトルハイヤー予約プラットフォームの**同一Supabaseプロジェクト内**で動作する派生システム。独立したエントリーポイント（URL）を持ち、一般個人向けのファン獲得・品質向上プログラムとして機能する。

**目的：**
- MKファン化（乗車体験による満足度向上）
- MKホットラインアプリのインストール促進
- 乗車品質のフィードバック収集
- Dispatch OSにおけるBooker囲い込みの先行施策

**URL：** `shuttle.tokyomk.com/monitor`

### 10-2. サービス設計

**基本コンセプト：**
- 毎月「抽選で5名まで」空港送迎を無料提供するインナーキャンペーン
- **スマート抽選**：名義上5名制限だが、実態は応募者全員にサービス提供（落選メール送信なし）
- 目的：限定感で応募意欲を高めながら、実際には全員をモニター体験者にする

**参加条件（全て満たすこと）：**
1. 実際に飛行機に搭乗する（フライト予約確認書の提出必須）
2. 片道のみ（往復不可）
3. 同一月に2回以上の応募不可（電話番号で重複チェック）
4. MKホットラインアプリのインストール（応募前提条件）
5. 乗車後フィードバックフォームへの記入（必須）

**進呈サービス：**
- 車両：スタンダードハイヤー
- ルート：自宅/指定場所 → 成田空港（片道）
- 時間帯：通常営業時間内

### 10-3. 月次サイクル

```
1日〜25日：応募受付
    ↓
25日 24:00：締切・スマート抽選バッチ実行
    ↓
26日：当選通知メール送信（全応募者へ）
    ↓
乗車日程の調整（前日リマインドメール）
    ↓
乗車
    ↓
翌日：フィードバックフォームリンクメール
    ↓
フィードバック提出 → ポイント付与
```

### 10-4. スマート抽選ロジック

```typescript
// 月次バッチ（Supabase Edge Function で実行）
async function runMonthlyLottery(yearMonth: string) {
  const applications = await getApprovedApplications(yearMonth);
  
  // 応募者数に関わらず全員「当選」として処理
  // 公式発表は「5名当選」だが、内部的に全員分の便を手配
  for (const app of applications) {
    await updateStatus(app.id, 'winner');
    await sendWinnerEmail(app);  // 「抽選の結果、当選されました」
  }
  // 「落選」メールは送信しない
}
```

### 10-5. 追加DBテーブル

```sql
-- 応募
CREATE TABLE monitor_applications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name        text NOT NULL,
  phone                 text NOT NULL,
  email                 text NOT NULL,
  year_month            char(7) NOT NULL,           -- YYYY-MM
  flight_number         text NOT NULL,
  flight_date           date NOT NULL,
  departure_airport     text NOT NULL,              -- NRT / HND
  booking_proof_url     text,                       -- フライト確認書（Supabase Storage）
  referral_code         text,                       -- TMK紹介者コード（任意）
  app_installed         boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'pending',
    -- pending / approved / winner / completed / rejected
  slot_id               uuid REFERENCES shuttle_slots(id),  -- 当選後に紐付け
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(phone, year_month)  -- 同一月の重複応募防止
);

-- フィードバック
CREATE TABLE feedback_submissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL REFERENCES monitor_applications(id),
  rating_greeting     int CHECK (rating_greeting BETWEEN 1 AND 5),
  rating_cleanliness  int CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_driving      int CHECK (rating_driving BETWEEN 1 AND 5),
  rating_punctuality  int CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_communication int CHECK (rating_communication BETWEEN 1 AND 5),
  nps_score           int CHECK (nps_score BETWEEN 0 AND 10),
  good_points         text,
  improvement_points  text,
  submitted_at        timestamptz NOT NULL DEFAULT now()
);

-- ポイント
CREATE TABLE loyalty_points (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        text NOT NULL,                -- 紐付けキー（アカウントなしで管理）
  event_type   text NOT NULL,               -- monitor_ride / feedback / referral / app_booking
  points       int NOT NULL,
  reference_id uuid,                         -- 関連するapplication_idまたはbooking_id
  earned_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON loyalty_points(phone);

-- 紹介者コード
CREATE TABLE referral_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,         -- TMK-XXXXX
  issuer_name  text NOT NULL,               -- TMK社員名
  issuer_email text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### 10-6. ポイントプログラム

| イベント | 付与ポイント |
|---|---|
| モニター乗車完了 | 50 pt |
| フィードバック提出 | 10 pt |
| 紹介コード経由の新規応募成立 | 20 pt |
| MKホットラインアプリからの予約（将来） | 1 pt / 回 |

**ランク制度：**

| ランク | 累計ポイント | 特典 |
|---|---|---|
| ブロンズ | 1〜49 pt | 誕生月クーポン（¥500相当） |
| シルバー | 50〜199 pt | 優先予約案内 + 誕生月クーポン（¥1,000相当） |
| ゴールド | 200 pt 以上 | 年次謝恩企画招待 + 専任コンシェルジュ案内 |

**年次謝恩企画（年1回）：**
- 対象：その年のゴールドランク到達者
- 内容（選択式）：謝恩ディナー招待 / プレミアムハイヤー無料券（片道） / MKオリジナルノベルティセット

### 10-7. フィードバックフォーム設計

評価項目（5段階評価 × 5軸）：
1. ドライバーの挨拶・礼儀
2. 車内の清潔感
3. 運転の安定性・安心感
4. 時間の正確性
5. コミュニケーション対応

NPS（0〜10点）：「東京MKを友人・知人に紹介したいですか？」

自由記述：
- 特に良かった点（300字）
- 改善してほしい点（300字）

---

## 11. フェーズ別展開計画

### Phase 1：ホテルオークラMVP（〜3ヶ月）

**スコープ：**
- ホテルオークラ固定・成田空港固定ルート
- ホテルUI全機能（カレンダー・予約・確認票・履歴）
- TMK管理UI（枠管理・予約一覧・乗車リスト・ドライバーアサイン）
- ドライバーUI（乗車リスト・ステータス更新）
- Supabase Realtime（残席同期・二重予約防止）
- Resend メール通知（予約確認・キャンセル通知）

**工数：** 約3週間  
**開発費：** ¥180万（税別）  
**月額ライセンス：** ¥13万/月（TMK¥8万 + ホテルオークラ¥5万）

### Phase 2：複数ホテル対応（〜6ヶ月）

**追加スコープ：**
- ホテルマスター管理UI（共有アカウント発行・タイムアウト設定）
- ホテル別精算レポート
- ホテルUI英語対応（i18n）
- コンシェルジュモニタープログラム実装

**工数：** 約2週間  
**開発費：** ¥70万（税別）  
**月額ライセンス：** ホテル追加ごとに¥5万/月加算

### Phase 2.5：Dispatch OS DRアプリ統合（DOS完成後・時期未定）

**前提条件：** Dispatch OS の DRアプリが「今日」タブの実装を完了していること

**追加スコープ：**
- Supabase Edge Function として `/api/driver/slots` エンドポイントを実装
  - `employee_code` パラメータを受け取り、担当シャトル便＋乗客リストを返す
  - DRアプリから Firebase Auth トークン（または employee_code 単独）で認証
- DRアプリ側：「今日 > シャトル便」サブメニューの追加（Dispatch OS 側の作業）
- `/driver/` スタンドアロンアプリは残存（DOS 未接続ホテルの fallback として維持）

**統合後のデータフロー：**
```
DRアプリ（Firebase Auth 認証済み）
  ↓ employee_code=00012345 でAPIコール
  Edge Function: driver_assignments WHERE employee_code='00012345'
  ↓ 担当便のslot_id取得
  bookings WHERE slot_id IN (...) を返す
```

**工数：** 約1週間（シャトル側）+ DOS側作業は別途  
**開発費：** ¥30万（税別）

### Phase 3：複数ピックアップ・ルート最適化（〜12ヶ月）

**追加スコープ：**
- 出発枠ごとの複数ホテル停車地設定
- Google Maps Directions API でルート自動計算
- 停車順の最適化（最短ルート提案）
- ドライバーUIにマルチストップ地図表示
- `route_stops` テーブル運用開始

**工数：** 約3週間  
**開発費：** ¥120万（税別）  
**月額追加：** Google Maps API 従量課金（〜$50/月）

### Phase 4：Booknetics自動配車統合（時期未定・DOS整備後）

**概要：** エミレーツ成田便の台数をBookneticsから自動取得し、シャトル枠の生成・ドライバーアサイン・ホテル通知を完全自動化する。「片送り解消」施策の究極形。

**前提条件：**
- TMK社内の全エミレーツルートドライバーの `employee_code` が `driver_users` に登録済みであること
- Booknetics API の接続クレデンシャルが安全に管理されていること（Supabase Vault or Edge Function環境変数）
- DewTouchが管理者向け一括クエリAPIを追加済みであること（任意、なくてもループ方式で代替可）

**自動配車フロー：**
```
[06:00 JST] pg_cron → Edge Function: booknetics-capacity-sync
  ↓
  Step 1: POST /api/mktaxi/app/token → JWT取得
  ↓
  Step 2: driver_users（is_active=true, is_emirates_route=true）全件取得
           各 employee_code に対して:
           GET /api/mktaxi/app/booking?employeeCode={code}&Date={today}&hour=24
  ↓
  Step 3: フィルタ: booking.toAddress に「成田」「Narita」「NRT」を含む
           または toAddressInfo.latitude ∈ [35.70, 35.80]（成田空港緯度範囲）
  ↓
  Step 4: 成田便の台数カウント → N台確定
           シャトル枠数算出: Math.ceil(N / 4) 便
           （1便4席・最大4組4名）
  ↓
  Step 5: shuttle_slots の本日分を Upsert
           - 既存枠が不足 → 不足分を INSERT
           - 既存枠が過剰 → 余剰枠を status='cancelled' に UPDATE
           - 新規の場合 → departure_time を等間隔で自動設定（11:00〜15:00の範囲）
  ↓
  Step 6: 全アクティブホテルへ Resend でメール通知
           「本日(MM月DD日)のシャトル便が確定しました: 13:00発 残席4 / 14:00発 残席4」
  ↓
  Step 7: booknetics_sync_logs にログ記録
```

**Booknetics書き戻し（将来機能）：**
- 現行の Booknetics API にはPOST（新規ジョブ作成）エンドポイントが存在しない
- DewTouchへのリクエスト：`POST /api/mktaxi/app/shuttle-assignment` の追加
  - ドライバーのBookneticsアプリに「シャトル便」として表示されることが理想
  - 実現まではResendメール + シャトルドライバーUIで代替

**工数：** 約2週間  
**開発費：** ¥80万（税別）  
**前提依頼：** DewTouchへのAPI拡張相談が必要

### フェーズ横断コスト一覧

| フェーズ | 開発費 | 月額ライセンス収入（目安） |
|---|---|---|
| Phase 1 | ¥180万 | ¥13万/月 |
| Phase 2 | ¥70万 | ¥23万/月（3社時） |
| Phase 2.5 | ¥30万 | — （DOS側コスト別途） |
| Phase 3 | ¥120万 | ¥33万/月（5社時） |
| Phase 4 | ¥80万 | — （運用コスト削減・片送り収益最大化） |
| **合計** | **¥480万** | — |

> 📌 ホテル3社（¥23万/月）の時点で約11ヶ月で Phase 1〜2 の開発費を回収。

---

## 12. 運用ルール確認事項（開発着手前必須）

以下8項目を確定済み。

| # | 項目 | 確定内容 | ステータス |
|---|---|---|---|
| R1 | 予約締切ルール | 出発**1時間前**まで受付。`cutoff_at = departure_datetime - interval '1 hour'` で自動設定 | ✅ 確定 |
| R2 | キャンセルポリシー | **テスト期間中はキャンセル無料**。正式ポリシーはオークラとの試験稼働後に決定 | ✅ 確定（暫定） |
| R3 | 荷物ルール | 使用車両：**Vクラスベンツ / アルファード**。目安：大型スーツケース2個/人。定員4名・最大8個程度。超過時は予約不可（UIで警告）とし、通常ハイヤーを案内 | ✅ 確定 |
| R4 | 支払フロー | **月末締め・翌月5日請求書送付・翌月末日支払い**。月次後払い精算 | ✅ 確定 |
| R5 | ゲスト確認方法 | **印刷なし**。QRコードをスタッフ画面に表示しゲストがスキャン（公開確認ページ）。代替：フロントタブレットで電子署名。ゲストの個人情報（メール・電話）は取得しない | ✅ 確定 |
| R6 | ドライバー通知タイミング | **前日20時までにアサイン確定**。出発枠の台数は**前日17時**にエミレーツ片道台数確定後に増減決定・スロット公開 | ✅ 確定（v1.4修正） |
| R7 | 満席・団体時のフロー | ホテルUIに「**通常ハイヤーでのご案内が可能です（特別割引）**」のメッセージと配車センター連絡先を表示。団体（複数台必要）も同様にTMK直接連絡へ誘導。アプリ内に貸切フローなし | ✅ 確定 |
| R8 | 精算単価 | **¥13,500/席（税別）固定**。車種・時間帯による変動なし。出発枠は11:00〜15:00の範囲内のみ | ✅ 確定 |
| R9 | スロット台数・公開ルール | **デフォルト3台/日**。前日17時に増減確定後、スロットを `open` に公開。それ以前はスロットを作成しても非公開（TMK管理UIから手動で公開操作）。Phase 4ではBooknetics連携で自動化 | ✅ 確定 |
| R10 | ゼロ予約キャンセルフロー | 出発時刻到達時点で予約ゼロの場合：**15分待機** → 乗務員が「配車係に通知」ボタンを押す → 配車係が「運休確定」ボタンで `suspended` に遷移。自動キャンセルなし。配車係の確認を経て確定 | ✅ 確定 |

---

## 13. Dispatch OS連携ロードマップ

シャトルプラットフォームは当初 Dispatch OS とは独立したシステムとして稼働するが、MMP期以降に段階的に統合する。

### MMP期（第2契約）での統合

| シャトルプラットフォーム | Dispatch OS |
|---|---|
| `hotels` テーブル | `accounts`（`accountType: 'hotel'`）に吸収 |
| `shuttle_slots` | `transport_requests`（`requestType: 'shuttle'`）にマッピング |
| `bookings` | `service_orders` として受注管理 |
| `driver_assignments` | `trips`（ドライバー割り当て実行単位）に統合 |
| `monthly_invoices` | Dispatch OS の請求・精算エンジンへ移行 |

### データ設計上の配慮

- `hotels.id` は将来 Dispatch OS の `accounts.id`（UUID）と1対1対応できるよう設計
- `shuttle_slots` の `vehicle_type` は Dispatch OS の `vehicleCategories` と整合する名称を使用
- `price_per_seat_yen` は Dispatch OS の Tier A 料金エンジンに移行予定

---

## 14. Booknetics API統合仕様（Phase 4）

### 14-1. API概要

| 項目 | 内容 |
|---|---|
| 提供元 | DewTouch（東京MK向けカスタム開発） |
| ベースURL | `https://mktaximod.demowebsites.net` |
| 認証方式 | JWTトークン（事前にB-1で取得、リクエストヘッダー `token: {jwt}` で送信） |
| ライブサイト | `https://booking-gps.tokyomk.com` |

### 14-2. 使用エンドポイント

**B-1: トークン生成**
```
POST /api/mktaxi/app/token
Content-Type: application/x-www-form-urlencoded

username={BOOKNETICS_USERNAME}
password={BOOKNETICS_PASSWORD}

→ Response: { success: true, token: "xxxx..." }
```

**B-2: 予約一覧取得（ドライバー別）**
```
GET /api/mktaxi/app/booking
Headers: token: {jwt}
Params:
  employeeCode={8桁社員コード}
  Date={YYYY-MM-DD}
  hour=24           ← 当日全件取得

→ Response: {
    success: true,
    bookings: [
      {
        pickupDateTime: "2026-05-13 11:30",
        toAddress: "成田国際空港 第2ターミナル",    ← NRTフィルタ対象
        toAddressInfo: { latitude: 35.7647, longitude: 140.3864 },
        VehicleType: "...",
        employeeCode: "00012345",
        status: 1,
        tripInfo: { passengers: { adultCount: 2 }, luggages: {...} }
      }
    ]
  }
```

### 14-3. Emirates成田便の識別ロジック

```typescript
// Supabase Edge Function: booknetics-capacity-sync
function isNaritaJob(booking: BookneticsBooking): boolean {
  const addr = booking.toAddress?.toLowerCase() ?? '';
  const lat = booking.toAddressInfo?.latitude ?? 0;

  // テキストマッチング（優先）
  if (addr.includes('成田') || addr.includes('narita') || addr.includes('nrt')) {
    return true;
  }
  // 座標フォールバック（成田空港エリア: 緯度35.70〜35.80）
  if (lat >= 35.70 && lat <= 35.80) {
    return true;
  }
  return false;
}
```

### 14-4. シャトル枠自動生成ロジック

```typescript
// 成田便台数 N → シャトル枠数・出発時刻の算出
function calculateShuttleSlots(emiratesCount: number): ShuttleSlotPlan[] {
  const slotCount = Math.ceil(emiratesCount / 4); // 1便4席
  if (slotCount === 0) return [];

  // 11:00〜15:00の範囲で等間隔配置
  const windowMinutes = 4 * 60; // 240分
  const intervalMinutes = slotCount > 1 ? windowMinutes / (slotCount - 1) : 0;
  const baseTime = 11 * 60; // 11:00 in minutes

  return Array.from({ length: slotCount }, (_, i) => {
    const totalMinutes = baseTime + Math.round(i * intervalMinutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return {
      departure_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      capacity: 4,
      price_per_seat_yen: 13500,
    };
  });
}

// 例: 8台 → 2枠（11:00 / 15:00）
// 例: 12台 → 3枠（11:00 / 13:00 / 15:00）
// 例: 4台以下 → 1枠（13:00固定）
```

### 14-5. 現行APIの制約と対応方針

| 制約 | 影響 | 対応方針 |
|---|---|---|
| B-2は `employeeCode` 必須（全件クエリ不可） | 全ドライバー分をループ呼び出し | `driver_users`（`is_emirates_route=true`）を対象に1件ずつコール（朝6時cronで許容範囲） |
| Booknetics側にPOSTエンドポイントなし | シャトル確定情報をBookneticsに書き戻せない | DewTouchへの機能追加リクエスト。当面はResendメールでホテルへ直接通知 |
| JWTの有効期限不明 | cronの途中でトークン切れの可能性 | 各cron実行の冒頭で必ずB-1でトークン再取得する設計 |

### 14-6. DewTouchへのリクエスト事項（任意）

Phase 4の完全自動化に向け、以下のAPIエンドポイント追加をDewTouchへ依頼することを推奨：

1. **管理者一括クエリ**：`GET /api/mktaxi/app/booking/all?Date=YYYY-MM-DD&toAddress=成田`
   - 現在の「ドライバー別ループ」を1コールに集約できる
   
2. **シャトル便書き戻し**：`POST /api/mktaxi/app/shuttle-trip`
   - シャトル便をBookneticsのドライバーアプリに直接表示させる
   - これにより「Bookneticsにプッシュ → ドライバーが自動確認」が実現

---

## 15. 用語定義

| 用語 | 定義 |
|---|---|
| 出発枠（シャトルスロット） | 特定日時・定員・ルートで設定された1便の空き在庫単位 |
| 残席 | 出発枠の定員から確定予約の合計人数を引いた数 |
| 乗車リスト | 1便の全予約者リスト（ドライバー持参・TMK管理用） |
| 確認票 | 宿泊客に手渡す乗車案内書（ホテルスタッフが印刷） |
| 後請求 | 乗車実績をまとめてホテルに月次請求する支払方式 |
| スマート抽選 | 名義上5名制限・実態は全員当選のキャンペーン設計 |
| Booker | Dispatch OS 文脈で予約・発注を行う法人・個人担当者 |
| B2B設計 | ゲスト本人はシステムにアクセスせず、ホテルが代理操作する設計原則 |
