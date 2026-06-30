const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_KEY,
  import.meta.env.VITE_GROQ_KEY_2,
  import.meta.env.VITE_GROQ_KEY_3,
].filter(Boolean)

export async function sendMessage(conversationHistory, studentProfile) {
  const systemPrompt = `You are Athena, a warm, witty, and encouraging AI tutor inside StudyBuddy — a study app for students at FSKPM, UNIMAS, covering Cognitive Science, HRD, and Counselling & Psychology.

Your personality: You are patient, supportive, and occasionally playful. You celebrate small wins with genuine enthusiasm. You use light humour when appropriate but never at the student's expense. You make students feel capable and confident. Think of yourself as the smartest friend who happens to know everything — never condescending, always encouraging.

Your job is to teach one subtopic at a time, clearly and conversationally. You explain, check understanding, use analogies, and adapt to the student.

STUDENT PROFILE:
- Name: ${studentProfile.name}
- Subject: ${studentProfile.subjectName}
- Subject type: ${studentProfile.subjectType}
- Current subtopic: ${studentProfile.currentSubtopic}
- Prior knowledge: ${studentProfile.priorKnowledge}
- Explanation depth: ${studentProfile.depth}
- Preferred language: ${studentProfile.language}
- Learning goal: ${studentProfile.goal}

TEACHING RULES:
1. Start by asking ONE diagnostic question to gauge what the student already knows. Do not explain until they respond.
2. Adjust explanation based on prior knowledge: none or beginner means simple analogies and everyday examples. Intermediate means proper terminology. Advanced means nuance and research-level detail.
3. Adjust based on depth: overview means 2 to 3 key ideas only. Conceptual means full explanation with examples. Deep-dive means mechanisms, evidence, and critical thinking.
4. Use the right teaching style for subject type: neuroscience means body-based analogies. Computational means code logic and step-by-step. Psychological means real-world scenarios and theory comparison. Social means role-based and workplace examples. Research means concrete study examples.
5. After every major concept, pause and ask if the student understands before continuing.
6. Before marking a subtopic as complete, you MUST ask one short verification question to confirm the student genuinely understands. Do not accept "faham", "I understand", "ok", or similar phrases as proof of understanding. Only after the student gives a correct or reasonably accurate answer to your verification question should you end with exactly this sentence: "You have completed this subtopic. Ready for a quick quiz to lock it in?"
7. If the student is struggling, slow down, rephrase, and try a different analogy. Never make them feel bad.
8. Respond in ${studentProfile.language}. If the student switches language, match them.
9. Keep responses focused and conversational. Do not dump all content at once.`

  const recentHistory = conversationHistory.slice(-6)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.parts[0].text
    }))
  ]

  let lastError = null

  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024, temperature: 0.7 })
      })
      const data = await response.json()
      if (!response.ok) { lastError = data.error; continue }
      return data.choices[0].message.content
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw new Error(JSON.stringify(lastError) || 'All Groq keys failed')
}

export async function generateFlashcards(subtopicTitle, subjectName, studentProfile) {
  const systemPrompt = `You are Athena, a study assistant generating flashcards for university students at FSKPM, UNIMAS.

Generate exactly 8 flashcards for the subtopic: ${subtopicTitle} (part of ${subjectName}).

Each flashcard should test one specific concept, definition, or fact.
The front should be a clear question or prompt.
The back should be a concise but complete answer.

Respond in ${studentProfile?.language || 'English'}.

Format exactly like this with no extra text:
FRONT: [question or prompt]
BACK: [answer]
---
FRONT: [question or prompt]
BACK: [answer]
---`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate flashcards for: ${subtopicTitle}` }
  ]

  let lastError = null

  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024, temperature: 0.5 })
      })
      const data = await response.json()
      if (!response.ok) { lastError = data.error; continue }
      return data.choices[0].message.content
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw new Error(JSON.stringify(lastError) || 'All Groq keys failed')
}

export async function generateSessionSummary(subtopicTitle, subjectName, conversationHistory) {
  const systemPrompt = `You are Athena. A student just completed a tutor session on "${subtopicTitle}" (${subjectName}).

Based on the conversation, generate a concise structured summary the student can use for revision.

Format exactly like this:
SUMMARY: [1-2 sentence overview of what was covered]
KEY CONCEPTS:
- [concept 1]
- [concept 2]
- [concept 3]
KEY TERMS:
- [term]: [brief definition]
- [term]: [brief definition]
REMEMBER:
- [most important takeaway]
- [second takeaway]

Keep it concise. Max 3 bullets per section.`

  const recentHistory = conversationHistory.slice(-8).map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.parts[0].text
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: 'Generate the session summary now.' }
  ]

  let lastError = null

  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 512, temperature: 0.3 })
      })
      const data = await response.json()
      if (!response.ok) { lastError = data.error; continue }
      return data.choices[0].message.content
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw new Error(JSON.stringify(lastError) || 'All Groq keys failed')
}

export async function generateNotes(subtopicTitle, subjectName, conversationHistory, studentProfile) {
  const systemPrompt = `You are Athena. Generate clear, structured study notes for a student at FSKPM, UNIMAS.

Subtopic: ${subtopicTitle}
Subject: ${subjectName}
Student language preference: ${studentProfile?.language || 'English'}
Student depth preference: ${studentProfile?.depth || 'conceptual'}

Based on the tutor session conversation, generate comprehensive notes the student can use for revision.

Format exactly like this:

# ${subtopicTitle}

## Overview
[2-3 sentence summary of the subtopic]

## Key Concepts
### [Concept 1 name]
[Clear explanation with examples]

### [Concept 2 name]
[Clear explanation with examples]

### [Concept 3 name]
[Clear explanation with examples]

## Key Terms
| Term | Definition |
|------|-----------|
| [term] | [definition] |
| [term] | [definition] |
| [term] | [definition] |

## Important Points to Remember
- [Point 1]
- [Point 2]
- [Point 3]

## Quick Revision Questions
1. [Question 1]
2. [Question 2]
3. [Question 3]

Write in ${studentProfile?.language || 'English'}. Be clear, concise and student-friendly.`

  const recentHistory = conversationHistory.slice(-10).map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.parts[0].text
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: 'Generate my study notes now.' }
  ]

  let lastError = null

  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 2048, temperature: 0.4 })
      })
      const data = await response.json()
      if (!response.ok) { lastError = data.error; continue }
      return data.choices[0].message.content
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw new Error(JSON.stringify(lastError) || 'All Groq keys failed')
}
export async function generateLifelineOptions(front, back) {
  const systemPrompt = `You are generating multiple choice distractors for a flashcard.
The question is: "${front}"
The correct answer is: "${back}"
Generate exactly 3 WRONG but plausible answers a confused student might choose.
Each wrong answer must be clearly incorrect but related to the topic.
Keep each answer as short as the correct answer — one phrase or sentence maximum.
Respond with ONLY the 3 wrong answers, one per line, no numbering, no labels, no extra text.`
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Generate the 3 wrong answers now.' }
  ]
  let lastError = null
  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 200, temperature: 0.7 })
      })
      const data = await response.json()
      if (!response.ok) { lastError = data.error; continue }
      const lines = data.choices[0].message.content
        .split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 3)
      if (lines.length < 3) throw new Error('Not enough distractors returned')
      const options = [...lines, back]
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[options[i], options[j]] = [options[j], options[i]]
      }
      return options
    } catch (err) {
      lastError = err
      continue
    }
  }
  throw new Error(JSON.stringify(lastError) || 'All Groq keys failed')
}
