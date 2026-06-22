'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'

type ActionResult = { error?: string; success?: boolean; message?: string; action?: string }

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('tmk_admin_users')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return (data as unknown as { is_super_admin: boolean } | null)?.is_super_admin ? user : null
}

const SYSTEM_PROMPT = `あなたはシャトルハイヤープラットフォームの設定アシスタントです。
ユーザーの自然言語指示を理解して、キャンセルポリシーやホテル設定を変更します。

ユーザーの指示から以下を抽出してください：
1. 対象（グローバル設定 or 特定ホテル）
2. 変更内容（threshold_hours, fee_pct, note）
3. 確認メッセージ

JSONで以下の形式で返してください：
{
  "intent": "update_policy",
  "target": "global" | "hotel:<hotel_id>",
  "changes": {
    "threshold_hours": number | null,
    "fee_pct": number | null,
    "note": string | null
  },
  "confirmation": "ユーザーへの確認メッセージ"
}

判断不可能な場合は：
{
  "intent": "clarify",
  "question": "ユーザーへの質問"
}

エラー・危険な指示の場合は：
{
  "intent": "reject",
  "reason": "理由"
}`;

export async function processSettingsAgent(
  userMessage: string,
  context?: { hotels?: Array<{ id: string; name: string }> }
): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません' }

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `ホテル一覧: ${context?.hotels?.map(h => `${h.name}(${h.id})`).join(', ') || 'なし'}\n\nユーザー指示: ${userMessage}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return { error: 'AIからのレスポンスが不正です' }
    }

    let parsed: any
    try {
      parsed = JSON.parse(content.text)
    } catch {
      return { error: 'AIの解析結果が不正です' }
    }

    // 意図別の処理
    if (parsed.intent === 'clarify') {
      return { message: parsed.question, action: 'clarify' }
    }

    if (parsed.intent === 'reject') {
      return { error: parsed.reason }
    }

    if (parsed.intent === 'update_policy') {
      // 設定変更実行
      const adminDb = createAdminClient()

      const target = parsed.target as string
      const isGlobal = target === 'global'
      const hotelId = isGlobal ? null : target.replace('hotel:', '')
      const changes = parsed.changes as { threshold_hours?: number; fee_pct?: number; note?: string }

      // 変更内容のバリデーション
      if (changes.threshold_hours !== undefined) {
        if (changes.threshold_hours <= 0) return { error: '閾値時間数は正の数である必要があります' }
      }
      if (changes.fee_pct !== undefined) {
        if (changes.fee_pct < 0 || changes.fee_pct > 100) return { error: 'キャンセル料率は 0〜100 の間である必要があります' }
      }

      // 管理者名取得
      const { data: adminUser } = await adminDb
        .from('tmk_admin_users')
        .select('display_name')
        .eq('user_id', caller.id)
        .single()

      const updaterName = (adminUser as unknown as { display_name?: string } | null)?.display_name ?? caller.email ?? 'unknown'

      // 既存ポリシー確認
      let query = adminDb.from('cancellation_policies').select('id')
      if (isGlobal) {
        query = query.is('hotel_id', null)
      } else {
        query = query.eq('hotel_id', hotelId)
      }

      const { data: existing } = await query.single()

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
        updated_by_name: updaterName,
      }

      if (changes.threshold_hours !== undefined) {
        updateData.threshold_hours = changes.threshold_hours
      }
      if (changes.fee_pct !== undefined) {
        updateData.fee_pct = changes.fee_pct
      }
      if (changes.note !== undefined) {
        updateData.note = changes.note
      }

      if (existing) {
        await adminDb
          .from('cancellation_policies')
          .update(updateData)
          .eq('id', (existing as any).id)
      } else {
        await adminDb.from('cancellation_policies').insert({
          ...updateData,
          hotel_id: hotelId,
          threshold_hours: changes.threshold_hours ?? 2,
          fee_pct: changes.fee_pct ?? 25,
        })
      }

      revalidatePath('/admin/superadmin/settings')

      return {
        success: true,
        message: parsed.confirmation,
        action: 'applied',
      }
    }

    return { error: '不明な意図です' }
  } catch (e) {
    console.error('[settings-agent] エラー:', e)
    return { error: 'AIサービスのエラーが発生しました' }
  }
}
