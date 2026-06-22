# データ保持ポリシー

**対象システム**: 東京エムケイ シャトルハイヤー予約システム  
**責任者**: ENG  
**最終更新**: 2026-06-22

---

## 保持期間一覧

| データ種別 | テーブル / カラム | 保持期間 | 削除方式 |
|---|---|---|---|
| 予約情報（氏名・フライト・人数等） | `bookings` | 乗車日から **2年** | 手動バッチ |
| ゲストメールアドレス | `bookings.guest_email` | 乗車完了から **6ヶ月** | カラム NULL 化 |
| 予約申請（ゲストLP入力分） | `booking_requests` | 作成日から **1年** | 手動バッチ |
| キャンセルOTP | `cancel_otps` | 有効期限から **24時間** | pg_cron 自動（毎日 03:00 JST） |
| ホテルセッション・認証情報 | Supabase Auth | セッション非活動から **30日** | Supabase 自動 |
| IPアドレス（レートリミット用） | `booking_requests.ip_address` | 上記に準ずる | 予約申請と同期 |
| アクセスログ | Vercel / Supabase ログ | **90日** | 各プラットフォーム自動 |

---

## 削除手順（手動バッチ）

### 乗車日から2年以上経過した予約の削除

```sql
-- 実行前に必ず件数確認
SELECT COUNT(*) FROM bookings
WHERE (
  SELECT date FROM shuttle_slots WHERE id = slot_id
) < CURRENT_DATE - INTERVAL '2 years';

-- 削除実行（スーパー管理者のみ）
DELETE FROM bookings
WHERE slot_id IN (
  SELECT id FROM shuttle_slots WHERE date < CURRENT_DATE - INTERVAL '2 years'
);
```

### 乗車完了から6ヶ月経過したゲストメール削除

```sql
-- guest_email のみ NULL 化（予約自体は保持）
UPDATE bookings SET guest_email = NULL
WHERE status IN ('completed', 'cancelled')
  AND slot_id IN (
    SELECT id FROM shuttle_slots
    WHERE date < CURRENT_DATE - INTERVAL '6 months'
  )
  AND guest_email IS NOT NULL;
```

---

## 自動化済みの処理

| 処理 | スケジュール | 実装 |
|---|---|---|
| `cancel_otps` 期限切れレコード削除 | 毎日 03:00 JST | pg_cron `cleanup-cancel-otps` |

---

## ユーザーからの削除請求への対応

1. `shuttle@tokyomk.com` へのメール受信後、**5営業日以内**に確認返信
2. 本人確認（確認コード or 予約情報の照合）
3. 当該 `booking.id` を特定し、上記 SQL にてデータ削除
4. 削除完了をメールで通知

---

## 関連文書

- [プライバシーポリシー](/privacy)
- [セキュリティ対応手順](./security_contact.md)
