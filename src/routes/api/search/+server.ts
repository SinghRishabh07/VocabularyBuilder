import { prisma} from '$lib/prisma'
import { json } from '@sveltejs/kit'

export async function GET({ url }) {

  const word = url.searchParams.get("word")?.toLowerCase()

  if (!word) {
    return json({ error: "Word required" }, { status: 400 })
  }

  // 1️⃣ check vocab
  const existingWord = await prisma.word.findUnique({
    where: { word },
    include: {
      meanings: {
        include: {
          examples: true
        }
      }
    }
  })

  if (existingWord) {
    return json({
      source: "vocab",
      word: existingWord
    })
  }

  // 2️⃣ call dictionary API
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
  )

  if (!response.ok) {
    return json({
      source: "invalid"
    })
  }

  const data = await response.json()

  return json({
    source: "dictionary",
    word: data[0]
  })
}