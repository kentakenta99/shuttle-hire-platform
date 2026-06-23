# Tasks Lessons — シャトルハイヤープラットフォーム

作業中に発生したミス・落とし穴・学習事項を記録する。
同じミスを繰り返さないために、作業開始前にこのファイルを確認すること。

---

## [2026-06-23] DOSアライメント: sed 置換パターンの限界

**ミス:** `sed -e 's/.confirmation_code/.booking_reference/g'` でプロパティアクセスは置換できたが、
`.eq('confirmation_code', ...)` のような **文字列リテラルとして渡されるカラム名** は置換できなかった。

**理由:** `sed` パターン `.confirmation_code` はドット記法（プロパティアクセス）にしかマッチしない。
Supabase の `.eq()` 第一引数はカラム名を文字列で渡す。

**対策:** カラム名リネーム時は sed 置換後に必ず以下を実行する。
```bash
grep -rn "'旧カラム名'" app/ lib/ --include="*.ts" --include="*.tsx"
```
ゼロ件になるまで追加修正する。

---

## [2026-06-23] database.types.ts は Supabase が生成するが手動で保つ必要がある

**ミス:** `lib/database.types.ts` の `bookings` テーブル定義 Update セクションだけ `confirmation_code` が残っていた
（Row・Insert は別の作業で更新済みだったが Update が抜けていた）。

**対策:** スキーマ変更時は Row / Insert / Update の **3つ全て** を確認してから完了とする。

---

## [2026-06-22] Email-First パターンの正しい理解

**原則:** OTP送信 Server Action では「メール送信 → 成功確認 → DB Insert」の順。
逆（DB Insert → メール送信）にすると、メール失敗時にゴミOTPがDBに残り、
ユーザーは「コードを送りました」と言われながら届かないメールを待つことになる。

**実装済みファイル:** `app/actions/cancel-otp.ts` の `sendCancelOtp()` を参照。

---

## [2026-06-23] pg_cron のスケジュールはマイグレーション≠適用

**ミス:** `cancel_otps` の自動削除クエリが仕様書に書かれていたが `--` でコメントアウトされており、
本番DBに適用されていなかった。仕様書に書いた = 実装済み、ではない。

**対策:** cron ジョブは必ず Supabase MCP の `execute_sql` または `apply_migration` で
本番DBに適用したことを確認してから「完了」とする。

---

## [2026-06-23] RLSポリシー名はテーブルリネームで追従しない

**事実:** `ALTER TABLE bookings RENAME TO service_orders` を実行すると、
PostgreSQL はポリシーの参照先テーブルを自動更新するが、**ポリシー名は変わらない**。

本番DBでは `hotel_staff_own_bookings` というポリシーが `service_orders` テーブルに存在する（機能は正常）。

**対策:** テーブルリネーム後にポリシー名を変えたい場合は `ALTER POLICY ... RENAME TO ...` で明示的に変更する。

---

## [2026-06-17〜] CLAUDE.md のテーブル名・仕様バージョンは必ず同期する

**ミス:** DOS アライメントでテーブル名を `service_orders` に変更したが、
CLAUDE.md の権限マトリクスに `bookings` が残り、AI が古い名前で実装するリスクが生まれた。

**対策:** テーブル名・カラム名を変更したら CLAUDE.md の該当箇所も同じコミットで更新する。

---

## [汎用] 大規模リネーム後のチェックリスト

1. `grep -rn "旧名" app/ lib/` → ゼロ件確認
2. `grep -rn "'旧カラム名'" app/ lib/` → ゼロ件確認（文字列リテラル）  
3. `database.types.ts` の Row / Insert / Update 全確認
4. `CLAUDE.md` の権限マトリクス・よくある落とし穴を更新
5. `docs/architecture/system_architecture.md` を更新
6. `docs/spec/specification.md` をバンプ
7. `npm run build` でゼロエラー確認
8. `git commit + push`
