import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { functionDescription, get_current_news } from './utils'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    openai.apiKey = previewToken
  }

  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages,
    temperature: 0.7,
    functions: [functionDescription],
    function_call: 'auto',
    stream: false
  })

  const message = res?.choices?.[0]?.message

  if (message?.function_call?.arguments) {
    const functionResponse = await get_current_news(
      JSON.parse(message.function_call.arguments)
    )

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      stream: false,
      messages: [
        ...messages,
        message,
        {
          role: 'function',
          name: message.function_call.name,
          content: functionResponse
        }
      ]
    })

    const functionMessage = response?.choices?.[0]?.message

    const title = json.messages[0].content.substring(0, 100)
    const id = json.id ?? nanoid()
    const createdAt = Date.now()
    const path = `/chat/${id}`
    const payload = {
      id,
      title,
      userId,
      createdAt,
      path,
      messages: [
        ...messages,
        {
          content: functionMessage.content,
          role: 'assistant'
        }
      ]
    }
    await kv.hmset(`chat:${id}`, payload)
    await kv.zadd(`user:chat:${userId}`, {
      score: createdAt,
      member: `chat:${id}`
    })

    return NextResponse.json(functionMessage.content)
  }

  const title = json.messages[0].content.substring(0, 100)
  const id = json.id ?? nanoid()
  const createdAt = Date.now()
  const path = `/chat/${id}`
  const payload = {
    id,
    title,
    userId,
    createdAt,
    path,
    messages: [
      ...messages,
      {
        content: message.content,
        role: 'assistant'
      }
    ]
  }
  await kv.hmset(`chat:${id}`, payload)
  await kv.zadd(`user:chat:${userId}`, {
    score: createdAt,
    member: `chat:${id}`
  })

  return NextResponse.json(message.content)
}
