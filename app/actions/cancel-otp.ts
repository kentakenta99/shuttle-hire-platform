'use server'

import { randomInt, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCancelOtpEmail } from '@/lib/email'

type SendResult   = { error: string } | { maskedEmail: string }
type VerifyResult = { error: string } | { verified: true }

// OTPをsha256でハッシュ化（booking_referenceをコンテキストソルトとして使用）
function hashOtp(otp: string, bookingReference: string): string {
  return createHash('sha256').update(`${otp}|${bookingReference}`).digest('hex')
}

// OTP送信 — Email-First Pattern:
//   メール送信を確認してからDBにInsertする。
//   送信失敗時はDBを汚さず即エラーを返す。
export async function sendCancelOtp(bookingReference: string): Promise<SendResult> {
  const db = createAdminClient()
  const code = bookingReference.toUpperCase()

  // 予約とゲストメールを取得
  const { data: booking } = await db
    .from('service_orders')
    .select('guest_name, guest_email, status')
    .eq('booking_reference', code)
    .single()

  if (!booking)                    return { error: '予約が見つかりません。' }
  if (booking.status !== 'confirmed') return { error: 'この予約はキャンセルできない状態です。' }
  if (!booking.guest_email)        return { error: 'メールアドレスが登録されていません。フロントデスクにご連絡ください。' }

  // レートリミット: 直近1時間に3回以上のOTP発行をブロック
  const { count } = await db
    .from('cancel_otps')
    .select('id', { count: 'exact', head: true })
    .eq('booking_reference', code)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if ((count ?? 0) >= 3) {
    return { error: 'しばらく時間をおいてから再試行してください（1時間に3回まで）。' }
  }

  // OTP生成
  const otp = randomInt(100000, 999999).toString()

  // ─── Email-First: メール送信を先に実行 ───────────────
  const emailResult = await sendCancelOtpEmail(booking.guest_email, {
    guestName: booking.guest_name,
    otp,
  })

  if (!emailResult) {
    // Resendがエラーを返した → DBには書かない → レートリミットも消費しない
    return { error: 'メールの送信に失敗しました。しばらく待ってから再試行してください。' }
  }
  // ─────────────────────────────────────────────────────

  // 送信成功確認後にDBへ保存（OTPはハッシュ化して保存）
  await db.from('cancel_otps').insert({
    booking_reference: code,
    otp_code: hashOtp(otp, code),
  })

  // メールアドレスをマスクして表示用に返す
  const [local, domain] = booking.guest_email.split('@')
  const masked = local.slice(0, 2) + '***@' + domain
  return { maskedEmail: masked }
}

// OTP検証 — 失敗5回でOTP自動無効化
export async function verifyCancelOtp(
  bookingReference: string,
  inputOtp: string,
): Promise<VerifyResult> {
  const db   = createAdminClient()
  const code = bookingReference.toUpperCase()

  // 有効なOTPを取得（attempt_count含む）
  const { data: otpRow } = await db
    .from('cancel_otps')
    .select('id, otp_code, attempt_count')
    .eq('booking_reference', code)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    return { error: 'コードが無効または期限切れです。もう一度送信してください。' }
  }

  const inputHash = hashOtp(inputOtp.trim(), code)

  if (otpRow.otp_code !== inputHash) {
    const newCount = (otpRow.attempt_count ?? 0) + 1

    if (newCount >= 5) {
      // 5回失敗: OTPを即時失効させ試行不可にする
      await db
        .from('cancel_otps')
        .update({ attempt_count: newCount, expires_at: new Date().toISOString() })
        .eq('id', otpRow.id)
      return { error: 'コードの試行回数が上限（5回）を超えました。新しいコードを送信してください。' }
    }

    await db
      .from('cancel_otps')
      .update({ attempt_count: newCount })
      .eq('id', otpRow.id)

    return { error: `コードが正しくありません。（あと${5 - newCount}回試行できます）` }
  }

  // 正解 → 使用済みにマーク
  await db
    .from('cancel_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otpRow.id)

  return { verified: true }
}
