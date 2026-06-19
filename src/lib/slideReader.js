import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export async function readPDFText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }
  return fullText
}

export async function readDOCXText(file) {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function readImageText(file, groqKeys) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type

  for (const key of groqKeys) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64}` }
                },
                {
                  type: 'text',
                  text: 'Extract all text content from this image. Return only the raw text, no commentary.'
                }
              ]
            }
          ],
          max_tokens: 1024,
        })
      })
      const data = await response.json()
      if (!response.ok) continue
      return data.choices[0].message.content
    } catch (err) {
      continue
    }
  }
  return ''
}

export async function readPPTXText(file) {
  // PPTX is a ZIP file — extract text from slide XML directly
  const JSZip = (await import('jszip')).default
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  
  let fullText = ''
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
    .sort()

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('string')
    // Extract text from XML tags
    const textMatches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || []
    const slideText = textMatches
      .map(match => match.replace(/<[^>]+>/g, ''))
      .join(' ')
    fullText += slideText + '\n'
  }
  return fullText
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractSubtopicsFromText(text, subjectName) {
  const GROQ_KEYS = [
    import.meta.env.VITE_GROQ_KEY,
    import.meta.env.VITE_GROQ_KEY_2,
    import.meta.env.VITE_GROQ_KEY_3,
  ].filter(Boolean)

  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a study assistant helping extract subtopics from lecture content for the subject: ${subjectName}. Extract the main topics/chapters as a numbered list. Return ONLY the subtopic names, one per line, no numbers or bullets, no extra text.`
            },
            {
              role: 'user',
              content: `Extract the main subtopics from this content:\n\n${text.slice(0, 3000)}`
            }
          ],
          max_tokens: 512,
          temperature: 0.3,
        })
      })
      const data = await response.json()
      if (!response.ok) continue
      const result = data.choices[0].message.content
      return result.split('\n').map(s => s.trim()).filter(s => s.length > 0 && s.length < 100)
    } catch (err) {
      continue
    }
  }
  return []
}