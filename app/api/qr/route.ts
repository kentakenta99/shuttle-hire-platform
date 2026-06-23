import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

// QRコード画像を生成して返す（外部APIに依存しない自己ホスト版）
// 使い方: /api/qr?data=https://...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get('data')

  if (!data) {
    return new NextResponse('Missing data parameter', { status: 400 })
  }

  const buffer = await QRCode.toBuffer(data, {
    type: 'png',
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
