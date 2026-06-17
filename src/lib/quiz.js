const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_KEY,
  import.meta.env.VITE_GROQ_KEY_2,
  import.meta.env.VITE_GROQ_KEY_3,
].filter(Boolean)

function getGroqKey() {
  return GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)]
}

export async function generateQuiz(subtopicTitle, subjectName, quizType, difficulty, conversationHistory, language = 'English') {

  const typeInstructions = {
    mcq: `Generate 5 multiple choice questions. For each question provide:
- The question text
- Four options labeled A, B, C, D
- The correct answer letter
- A brief explanation of why that answer is correct

Format each question exactly like this:
Q1: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [letter]
Explanation: [explanation]
---`,
    structured: `Generate 3 structured questions that require a written answer of 2-4 sentences. For each question provide:
- The question text
- A model answer the student can compare against

Format each question exactly like this:
Q1: [question]
Model Answer: [answer]
---`,
    essay: `Generate 1 essay question that requires a detailed response. Provide:
- The essay question
- Key points that a good answer should cover (5-7 bullet points)

Format exactly like this:
Essay Question: [question]
Key Points:
- [point 1]
- [point 2]
- [point 3]
---`,
  }

  const difficultyNote = {
    beginner: 'Keep questions simple and straightforward. Test basic recall and understanding.',
    intermediate: 'Questions should test understanding and application of concepts.',
    advanced: 'Questions should challenge critical thinking, analysis, and synthesis.',
  }

  const languageInstruction = language === 'Bahasa Malaysia'
    ? 'IMPORTANT: Generate ALL questions, options, model answers, and explanations in Bahasa Malaysia.'
    : language === 'Mix of both'
    ? 'You may mix English and Bahasa Malaysia naturally in questions and answers.'
    : 'Generate everything in English.'

  const systemPrompt = `You are an exam question generator for university students at FSKPM, UNIMAS.
Generate questions about: ${subtopicTitle} (part of ${subjectName}).
Difficulty: ${difficulty} — ${difficultyNote[difficulty]}
${languageInstruction}
${typeInstructions[quizType]}
Generate only the questions in the exact format specified. No introduction, no extra text.`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getGroqKey()}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${quizType} questions about ${subtopicTitle}.` }
      ],
      max_tokens: 2048,
      temperature: 0.5
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Quiz generation failed')
  return data.choices[0].message.content
}

export async function evaluateAnswer(question, studentAnswer, modelAnswer, subtopicTitle, language = 'English') {

  const languageInstruction = language === 'Bahasa Malaysia'
    ? 'IMPORTANT: You must respond entirely in Bahasa Malaysia. All feedback and suggestions must be in Bahasa Malaysia.'
    : language === 'Mix of both'
    ? 'You may mix English and Bahasa Malaysia naturally in your response.'
    : 'Respond in English.'

  const systemPrompt = `You are a university lecturer marking a student answer at FSKPM, UNIMAS.
${languageInstruction}

Subtopic: ${subtopicTitle}
Question: ${question}
Model Answer: ${modelAnswer}
Student Answer: ${studentAnswer}

Evaluate the student answer. Be constructive, kind, and encouraging. If the answer is incomplete or wrong, explain specifically what was missing and give a clear suggestion on how to improve. Never make the student feel bad.

Respond in exactly this format:
Score: [number from 0 to 10]
Feedback: [2-3 sentences of supportive, constructive, specific feedback]`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Evaluate this answer.' }
      ],
      max_tokens: 512,
      temperature: 0.3
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Evaluation failed')
  return data.choices[0].message.content
}