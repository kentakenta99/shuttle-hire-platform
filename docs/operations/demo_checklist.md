# デモ当日運用チェックリスト
**対象デモ:** 東京エムケイ × ホテルオークラ東京  
**推奨シナリオ順:** ゲスト体験（C）→ ホテルスタッフ（A）→ TMK管理者（B）

---

## 前日夜（デモ前日）

### データ準備
- [ ] `scripts/reset-demo.sql` を Supabase SQL Editor で実行（前回データを削除）
- [ ] `scripts/seed-demo-okura.sql` を実行（ホテルオークラ用スロット・予約を投入）
- [ ] seed 結果の確認クエリを実行し、スロット7日分・予約データが正しく入っていることを確認
- [ ] ホテルオークラ用デモアカウントでログインできることを確認（`/hotel/login`）
- [ ] TMK管理者デモアカウントでログインできることを確認（`/admin/login`）
- [ ] ドライバーデモアカウントでログインできることを確認（`/driver/login`）
- [ ] `NEXT_PUBLIC_DISPATCH_PHONE` を Vercel 環境変数に設定済みか確認

### 環境確認
- [ ] Vercel ダッシュボードで最新デプロイが **Ready** であること
- [ ] Supabase プロジェクトが **Active**（Paused でない）こと
- [ ] Vercel Cron Jobs タブで `/api/cron/notify-departure` が **Active** であること

---

## 当日朝（デモ2時間前）

### インフラ最終確認（所要15分）

```
1. Vercel → Project → Deployments → 最新が "Ready" か確認
2. Vercel → Project → Environment Variables → 下記がすべて設定済みか確認
   ✓ NEXT_PUBLIC_SUPABASE_URL
   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
   ✓ SUPABASE_SERVICE_ROLE_KEY
   ✓ RESEND_API_KEY
   ✓ CRON_SECRET
   ✓ AVIATIONSTACK_API_KEY
   ✓ NEXT_PUBLIC_APP_URL = https://shuttle.tokyomk.com
   ✓ NEXT_PUBLIC_DISPATCH_PHONE = 03-XXXX-XXXX（実際の番号）
3. Supabase → Project → Table Editor → service_orders に本日分の予約があること
4. ブラウザのシークレットウィンドウで https://shuttle.tokyomk.com を開き表示確認
```

### デモデバイス準備
- [ ] デモ用PC：ホテルスタッフ画面を表示済み（`/hotel/calendar`）
- [ ] デモ用スマホ：ゲスト確認ページのURL（`/confirm/[bookingReference]`）をブックマーク
- [ ] Chromeタブを事前に開いておく：`/hotel/calendar`、`/admin`、`/confirm/...`
- [ ] Wi-Fi接続確認（外部API: AviationStack に接続できるか）

---

## デモ進行シナリオ

### シナリオC：ゲスト体験（3分）— まずここから始める

> 「このQRコードが乗車チケットです」

1. スマホで `/confirm/[bookingReference]` を表示
2. QRコードと確認番号・出発日時を見せる
3. フライト警告カウントダウンを見せる（出発3時間前なら警告が表示される）
4. 「キャンセルしたい場合は…」でOTPフローの入り口を見せる

**ポイント:** QRはサーバーサイド生成のため外部サービス障害に影響されない

---

### シナリオA：ホテルスタッフ視点（8分）— メインデモ

> 「このQRは、ここから作られています」

1. `/hotel/login` でログイン
2. `/hotel/calendar` でスロット一覧（残席カウント）を見せる
3. **デモ用に2タブ開いておく** — 片方で予約すると残席がリアルタイムで変わる演出
4. スロットをクリック → ゲスト情報入力 → 予約確定
5. 「ゲストにQRチケットメールが届きます」と説明（実際に届いていれば見せる）
6. `/hotel/bookings` で予約一覧を確認
7. `/hotel/requests` でゲストセルフリクエストの承認フローを見せる

**ポイント:** Realtime残席は視覚的インパクトが最大

---

### シナリオB：TMK管理者視点（5分）— 最後に裏側を見せる

> 「TMK側の運用ダッシュボードです」

1. `/admin` ダッシュボード（今日・明日のサマリー）
2. `/admin/slots/new` でスロット作成（単体 → 一括作成の違いを見せる）
3. `/admin/slots/[id]` でドライバーアサイン
4. `/admin/bookings` で全ホテル横断の予約一覧・CSV出力

**ポイント:** 「複数ホテルの予約を一元管理できる」を強調

---

## デモ中に聞かれたら正直に答える項目

| 質問 | 正直な回答 |
|------|-----------|
| 決済はどうなっていますか？ | 現在は月末請求のみ。オンライン決済は今後の拡張機能として検討中 |
| GPSリアルタイム追跡は？ | 現バージョンには含まれていません（ロードマップにあります） |
| ドライバーへの自動通知は？ | ドライバーアプリへのプッシュ通知は今後の機能です。現在はアサイン後にメールで通知 |
| 複数ホテルへの展開は？ | DB設計は複数ホテル対応済み。ホテルごとに独立したログイン・設定が可能 |
| 通常ハイヤーの予約は受けられますか？ | 現在はシャトル（シェアドトランスファー）専用です |

---

## 緊急時対応

### デプロイが壊れていた場合
```bash
vercel rollback --yes  # 直前のデプロイに戻す
```

### Supabase が Paused になっていた場合
→ Supabase ダッシュボード → Project Settings → General → **Restore project**

### デモ中にデータが汚れた場合
→ デモ終了後に `scripts/reset-demo.sql` → `scripts/seed-demo-okura.sql` で再投入

---

## デモ後のフォローアップ

- [ ] ホテルオークラ担当者に `seed-demo-okura.sql` で使った確認URLをシェアする
- [ ] 「本番アカウント発行のためのオンボーディング手順」を `docs/operations/hotel_onboarding.md` に基づいて実施
- [ ] デモで出た質問・要望を GitHub Issue に起票する
- [ ] 齊藤さん（miraisaito）への共有タイミングを Kenさんと確認
