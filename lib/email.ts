import { Resend } from 'resend'

const FROM = 'シャトルハイヤー予約システム <onboarding@resend.dev>'

type SendOpts = Parameters<Resend['emails']['send']>[0]

// RESEND_API_KEY未設定時はログだけ出してスキップ（モジュール初期化時にクラッシュしない）
async function send(opts: SendOpts) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY未設定 - 送信スキップ:', opts.subject)
    return { id: 'skipped' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send(opts)
  if (error) console.error('[email] 送信エラー:', error)
  return data
}

type BookingInfo = {
  guestName: string
  confirmationCode: string
  confirmUrl: string
  date: string
  departureTime: string
  partySize: number
  luggageCount: number
  flightNumber: string
  notes?: string | null
  hotelName: string
}

export async function sendBookingConfirmation(to: string, info: BookingInfo) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  return send({
    from: FROM,
    to,
    subject: `【予約確定】${info.guestName} 様 / ${departureLabel}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#2563eb;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#bfdbfe;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">予約が確定しました</h1>
  </div>

  <p style="color:#475569;font-size:14px">以下の予約が確定しました。お客様にゲスト確認URLをお伝えください。</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${[
      ['確認番号', `<strong style="font-family:monospace;font-size:18px;color:#2563eb">${info.confirmationCode}</strong>`],
      ['お客様名', `${info.guestName} 様`],
      ['出発日時', departureLabel],
      ['人数', `${info.partySize}名`],
      ['お荷物', `${info.luggageCount}個`],
      ['フライト番号', info.flightNumber],
      ...(info.notes ? [['備考', info.notes]] : []),
    ].map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:35%">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px">${value}</td>
    </tr>`).join('')}
  </table>

  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
    <p style="font-size:13px;color:#0369a1;margin:0 0 8px"><strong>ゲスト確認URL（QRコード）</strong></p>
    <a href="${info.confirmUrl}" style="font-size:14px;color:#2563eb;word-break:break-all">${info.confirmUrl}</a>
    <p style="font-size:12px;color:#64748b;margin:8px 0 0">このURLをお客様のスマートフォンで読み込むと、乗車案内が表示されます。</p>
  </div>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    東京エムケイ株式会社 シャトルハイヤー予約システム
  </p>
</body>
</html>`,
  })
}

export async function sendGuestBookingConfirmation(to: string, info: BookingInfo) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  return send({
    from: FROM,
    to,
    subject: `【乗車案内】${departureLabel} 東京エムケイ シャトルハイヤー`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">乗車ご案内</h1>
  </div>

  <p style="color:#475569;font-size:14px">${info.guestName} 様<br>このたびはご予約いただきありがとうございます。以下の内容でシャトルハイヤーをご用意しております。</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${[
      ['確認番号', `<strong style="font-family:monospace;font-size:20px;color:#0f172a;letter-spacing:2px">${info.confirmationCode}</strong>`],
      ['出発日時', `<strong>${departureLabel}</strong>`],
      ['人数', `${info.partySize}名`],
      ['お荷物', `${info.luggageCount}個`],
      ['フライト番号', info.flightNumber],
      ['予約ホテル', info.hotelName],
      ...(info.notes ? [['備考', info.notes]] : []),
    ].map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:35%">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px">${value}</td>
    </tr>`).join('')}
  </table>

  <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
    <p style="font-size:13px;color:#166534;margin:0 0 12px;font-weight:bold">乗車時にこのQRコードをご提示ください</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(info.confirmUrl)}" alt="QRコード" style="width:180px;height:180px;display:block;margin:0 auto 12px" />
    <p style="font-size:11px;color:#4ade80;margin:0 0 4px">確認URL</p>
    <a href="${info.confirmUrl}" style="font-size:12px;color:#166534;word-break:break-all">${info.confirmUrl}</a>
  </div>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    ご不明な点はホテルフロントまたは東京エムケイ配車センターまでお問い合わせください。<br>
    東京エムケイ株式会社
  </p>
</body>
</html>`,
  })
}

export async function sendCancellationNotice(to: string, info: {
  guestName: string
  confirmationCode: string
  date: string
  departureTime: string
  reason?: string | null
  hotelName: string
}) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  return send({
    from: FROM,
    to,
    subject: `【キャンセル確認】${info.guestName} 様 / ${departureLabel}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#ef4444;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#fecaca;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">予約がキャンセルされました</h1>
  </div>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${[
      ['確認番号', `<span style="font-family:monospace">${info.confirmationCode}</span>`],
      ['お客様名', `${info.guestName} 様`],
      ['出発日時', departureLabel],
      ...(info.reason ? [['キャンセル理由', info.reason]] : []),
    ].map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:35%">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px">${value}</td>
    </tr>`).join('')}
  </table>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    東京エムケイ株式会社 シャトルハイヤー予約システム
  </p>
</body>
</html>`,
  })
}

export async function sendSuspensionNotice(to: string, info: {
  hotelName: string
  date: string
  departureTime: string
  affectedBookings: { guestName: string; confirmationCode: string; partySize: number }[]
}) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  return send({
    from: FROM,
    to,
    subject: `【運休のお知らせ】${departureLabel} シャトルハイヤー便`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#f59e0b;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#fef3c7;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">便の運休をお知らせします</h1>
  </div>

  <p style="font-size:14px;color:#475569">
    ${info.hotelName} ご担当者様<br><br>
    大変申し訳ございませんが、以下の便が運休となりました。<br>
    対象のご予約については、別便または代替交通手段をご案内ください。
  </p>

  <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
    <p style="font-size:14px;font-weight:bold;margin:0 0 4px">運休便</p>
    <p style="font-size:18px;font-weight:bold;color:#b45309;margin:0">${departureLabel}</p>
  </div>

  <p style="font-size:13px;font-weight:bold;margin:20px 0 8px">影響を受けるご予約 (${info.affectedBookings.length}件)</p>
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">確認番号</th>
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">お客様名</th>
        <th style="text-align:center;padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">人数</th>
      </tr>
    </thead>
    <tbody>
      ${info.affectedBookings.map(b => `
      <tr>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;border-bottom:1px solid #f1f5f9">${b.confirmationCode}</td>
        <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9">${b.guestName} 様</td>
        <td style="padding:8px 12px;text-align:center;font-size:13px;border-bottom:1px solid #f1f5f9">${b.partySize}名</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    ご不便をおかけして大変申し訳ございません。<br>
    東京エムケイ株式会社 配車センター
  </p>
</body>
</html>`,
  })
}

export async function sendDepartureReminderGuest(to: string, info: {
  guestName: string
  confirmationCode: string
  date: string
  departureTime: string
  vehicleType: string
  vehiclePlate: string | null
  confirmUrl: string
}) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  return send({
    from: FROM,
    to,
    subject: `【出発15分前】${departureLabel} 東京エムケイ シャトルハイヤー`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">出発まであと15分です</h1>
  </div>

  <p style="color:#475569;font-size:14px">${info.guestName} 様<br><br>
  シャトルハイヤーが間もなく出発します。ロビーへお越しください。</p>

  <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:20px;margin:20px 0">
    <p style="font-size:20px;font-weight:bold;color:#713f12;margin:0 0 4px">${departureLabel}</p>
    ${info.vehicleType ? `<p style="font-size:13px;color:#92400e;margin:0">${info.vehicleType}${info.vehiclePlate ? `　${info.vehiclePlate}` : ''}</p>` : ''}
  </div>

  <p style="font-size:13px;color:#475569">
    乗車時は以下のQRコードをドライバーにご提示ください。
  </p>

  <div style="text-align:center;margin:16px 0">
    <a href="${info.confirmUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
      QRチケットを表示する
    </a>
  </div>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    確認番号: ${info.confirmationCode}<br>
    東京エムケイ株式会社 シャトルハイヤー予約システム
  </p>
</body>
</html>`,
  })
}

export async function sendDepartureReminderHotel(to: string, info: {
  hotelName: string
  date: string
  departureTime: string
  vehicleType: string
  vehiclePlate: string | null
  guests: { guestName: string; partySize: number; confirmationCode: string }[]
}) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  const totalGuests = info.guests.reduce((s, g) => s + g.partySize, 0)
  return send({
    from: FROM,
    to,
    subject: `【出発15分前】${departureLabel} シャトルハイヤー（${totalGuests}名）`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">出発15分前 — ゲスト呼び出しのご案内</h1>
  </div>

  <p style="color:#475569;font-size:14px">
    ${info.hotelName} ご担当者様<br><br>
    以下のゲストの出発まで15分となりました。ロビーへのご案内をお願いします。
  </p>

  <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:20px;margin:16px 0">
    <p style="font-size:20px;font-weight:bold;color:#713f12;margin:0 0 4px">${departureLabel}</p>
    ${info.vehicleType ? `<p style="font-size:13px;color:#92400e;margin:0">${info.vehicleType}${info.vehiclePlate ? `　${info.vehiclePlate}` : ''}</p>` : ''}
    <p style="font-size:13px;color:#92400e;margin:4px 0 0">合計 ${totalGuests}名</p>
  </div>

  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">お客様名</th>
        <th style="text-align:center;padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">人数</th>
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">確認番号</th>
      </tr>
    </thead>
    <tbody>
      ${info.guests.map(g => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9">${g.guestName} 様</td>
        <td style="padding:8px 12px;font-size:13px;text-align:center;border-bottom:1px solid #f1f5f9">${g.partySize}名</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;border-bottom:1px solid #f1f5f9">${g.confirmationCode}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    東京エムケイ株式会社 配車センター
  </p>
</body>
</html>`,
  })
}

export async function sendDriverAssignment(to: string, info: {
  driverName: string
  date: string
  departureTime: string
  capacity: number
  remainingSeats: number
  vehicleType: string
  notes: string | null
}) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  const booked = info.capacity - info.remainingSeats
  return send({
    from: FROM,
    to,
    subject: `【乗務アサイン】${departureLabel} シャトルハイヤー`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">乗務アサインのご連絡</h1>
  </div>

  <p style="color:#475569;font-size:14px">${info.driverName} 乗務員 殿<br><br>
  以下の便に乗務をアサインしました。ご確認ください。</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${[
      ['出発日時', `<strong style="font-size:18px;color:#0f172a">${departureLabel}</strong>`],
      ['車両種別', info.vehicleType || '未定'],
      ['予約人数', `${booked}名 / 定員${info.capacity}名`],
      ...(info.notes ? [['備考', info.notes]] : []),
    ].map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:35%">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px">${value}</td>
    </tr>`).join('')}
  </table>

  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
    <p style="font-size:13px;color:#0369a1;margin:0">
      ご不明な点は配車センターまでご連絡ください。
    </p>
  </div>

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    東京エムケイ株式会社 シャトルハイヤー予約システム
  </p>
</body>
</html>`,
  })
}

export async function sendGuestCancellationEmail(to: string, info: {
  guestName: string
  confirmationCode: string
  date: string
  departureTime: string
  cancellationFee: number
  totalPrice: number
}) {
  const departureLabel = `${info.date} ${info.departureTime.slice(0, 5)} 発`
  const isFee = info.cancellationFee > 0
  const feeLabel = isFee
    ? `¥${info.cancellationFee.toLocaleString()}（ご予約額の25%）`
    : '無料'

  return send({
    from: FROM,
    to,
    subject: `【キャンセル確認】${info.guestName} 様 / ${departureLabel}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#ef4444;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#fecaca;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:22px;margin:4px 0 0">予約をキャンセルしました</h1>
  </div>

  <p style="color:#475569;font-size:14px">${info.guestName} 様、以下の予約がキャンセルされました。</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${[
      ['確認番号', `<span style="font-family:monospace">${info.confirmationCode}</span>`],
      ['出発日時', departureLabel],
      ['キャンセル料', `<strong${isFee ? ' style="color:#dc2626"' : ' style="color:#16a34a"'}>${feeLabel}</strong>`],
    ].map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:35%">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px">${value}</td>
    </tr>`).join('')}
  </table>

  ${isFee ? `
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
    <p style="font-size:13px;color:#dc2626;margin:0">
      出発2時間以内のキャンセルのため、キャンセル料 ¥${info.cancellationFee.toLocaleString()} が発生しました。<br>
      お支払い方法については担当スタッフよりご連絡いたします。
    </p>
  </div>` : `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
    <p style="font-size:13px;color:#16a34a;margin:0">
      キャンセル料は発生しません。またのご利用をお待ちしております。
    </p>
  </div>`}

  <p style="font-size:12px;color:#94a3b8;margin-top:24px">
    東京エムケイ株式会社 シャトルハイヤー予約システム
  </p>
</body>
</html>`,
  })
}

export async function sendCancelOtpEmail(to: string, info: {
  guestName: string
  otp: string
}) {
  return send({
    from: FROM,
    to,
    subject: `【確認コード】キャンセル認証 — ${info.otp}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:480px;margin:0 auto;padding:24px">
  <div style="background:#1d4ed8;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#bfdbfe;font-size:13px;margin:0">東京エムケイ シャトルハイヤー</p>
    <h1 style="color:#ffffff;font-size:20px;margin:4px 0 0">キャンセル認証コード</h1>
  </div>
  <p style="color:#475569;font-size:14px">${info.guestName} 様</p>
  <p style="color:#475569;font-size:14px">以下の6桁コードをキャンセル画面に入力してください。有効期限は<strong>10分間</strong>です。</p>
  <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
    <p style="font-size:40px;font-family:monospace;font-weight:900;letter-spacing:0.3em;color:#1e293b;margin:0">${info.otp}</p>
  </div>
  <p style="font-size:12px;color:#94a3b8">このメールに心当たりのない場合は無視してください。コードは自動的に失効します。</p>
  <p style="font-size:12px;color:#94a3b8;margin-top:16px">東京エムケイ株式会社 シャトルハイヤー予約システム</p>
</body>
</html>`,
  })
}
