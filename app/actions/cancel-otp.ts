'use server'

import { randomInt } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCancelOtpEmail } from '@/lib/email'

type SendResult = { error: string } | { maskedEmail: string }
type VerifyResult = { error: string } | { verified: true }

// OTP送信：1確認コードあたり1時間に3回まで
export async function sendCancelOtp(confirmationCode: string): Promise<SendResult> {
  const db = createAdminClient()

  // 予約とゲストメールを取得
  const { data: booking } = await db
    .from('bookings')
    .select('guest_name, guest_email, status')
    .eq('confirmation_code', confirmationCode.toUpperCase())
    .single()

  if (!booking) return { error: '予約が見つかりません。' }
  if (booking.status !== 'confirmed') return { error: 'この予約はキャンセルできない状態です。' }
  if (!booking.guest_email) return { error: 'メールアドレスが登録されていません。フロントデスクにご連絡ください。' }

  // レートリミット: 直近1時間に3回以上のOTP発行をブロック
  const { count } = await db
    .from('cancel_otps')
    .select('id', { count: 'exact', head: true })
    .eq('confirmation_code', confirmationCode.toUpperCase())
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if ((count ?? 0) >= 3) {
    return { error: 'しばらく時間をおいてから再試行してください（1時間に3回まで）。' }
  }

  // 6桁OTPを生成
  const otp = randomInt(100000, 999999).toString()

  await db.from('cancel_otps').insert({
    confirmation_code: confirmationCode.toUpperCase(),
    otp_code: otp,
  })

  await sendCancelOtpEmail(booking.guest_email, {
    guestName: booking.guest_name,
    otp,
  })

  // メールアドレスをマスクして返す（表示用）
  const [local, domain] = booking.guest_email.split('@')
  const masked = local.slice(0, 2) + '***@' + domain
  return { maskedEmail: masked }
}

// OTP検証：有効期限内・未使用・5回試行まで
export async function verifyCancelOtp(
  confirmationCode: string,
  inputOtp: string
): Promise<VerifyResult> {
  const db = createAdminClient()

  // 有効なOTPを取得（新しい順）
  const { data: otpRow } = await db
    .from('cancel_otps')
    .select('id, otp_code, used_at')
    .eq('confirmation_code', confirmationCode.toUpperCase())
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    return { error: 'コードが無効または期限切れです。もう一度送信してください。' }
  }

  if (otpRow.otp_code !== inputOtp.trim()) {
    return { error: 'コードが正しくありません。' }
  }

  // 使用済みにマーク
  await db
    .from('cancel_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otpRow.id)

  return { verified: true }
}
