'use client'

import { useState, useRef, useEffect } from 'react'
import { processSettingsAgent } from '@/app/actions/settings-agent'

type Hotel = {
  id: string
  name: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: 'clarify' | 'applied' | 'error'
}

type Props = {
  hotels: Hotel[]
}

export default function SettingsAgentChat({ hotels }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'こんにちは。キャンセルポリシーやその他の設定について、お気軽にお聞きください。例：「オークラは2時間以内なら50%取ってください」',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')

    // ユーザーメッセージを追加
    const userMsgObj: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMsg,
    }
    setMessages((prev) => [...prev, userMsgObj])

    setLoading(true)

    try {
      const result = await processSettingsAgent(userMsg, { hotels })

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.message || result.error || 'エラーが発生しました',
        action: result.action as 'clarify' | 'applied' | 'error' | undefined,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'エラーが発生しました。もう一度お試しください。',
          action: 'error',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <h2 className="font-bold text-lg">🤖 設定アシスタント</h2>
        <p className="text-xs text-blue-100 mt-1">
          自然言語でキャンセルポリシーやホテル設定を変更できます
        </p>
      </div>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : msg.action === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-none'
                    : msg.action === 'applied'
                      ? 'bg-green-50 text-green-700 border border-green-200 rounded-bl-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              {msg.action === 'applied' && (
                <p className="text-xs mt-2 font-semibold">✓ 設定が更新されました</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={loading}
            placeholder="例：「オークラは2時間以内なら50%取ってください」"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '処理中...' : '送信'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          💡 ヒント：ホテル名を指定すればそのホテル限定の設定になります。「全ホテル」「グローバル」と言えば全体設定です。
        </p>
      </div>
    </div>
  )
}
