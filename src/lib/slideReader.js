const GROQ_KEY = import.meta.env.VITE_GROQ_KEY

export async function extractSubtopicsFromText(slideText, subjectName) {
  const systemPrompt = `You are an academic content analyser for university students at FSKPM, UNIMAS.
A student has uploaded lecture slides for the subject: ${subjectName}

Your job is to read the slide content and extract the main subtopics that a student should study.

Rules:
- Extract between 3 and 8 subtopics
- Each subtopic should be a clear specific learning topic
- Use the exact terminology from the slides where possible
- Do not include administrative content like dates lecturer names or assessment info
- Return ONLY a numbered list nothing else no introduction no explanation

Example format:
1. Introduction to Neurons and Synapses
2. The Action Potential Mechanism
3. Types of Neurotransmitters`

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
        { role: 'user', content: `Here is the slide content:\n\n${slideText.slice(0, 8000)}` }
      ],
      max_tokens: 512,
      temperature: 0.3
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Extraction failed')

  const raw = data.choices[0].message.content
  const lines = raw.split('\n')
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(l => l.length > 0 && l.length < 200)
  return lines
}

export async function readPDFText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result)

        // Load PDF.js from CDN
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'

        script.onload = async () => {
          try {
            const pdfjsLib = window['pdfjs-dist/build/pdf']
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

            const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
            let fullText = ''

            for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) {
              const page = await pdf.getPage(i)
              const content = await page.getTextContent()
              const pageText = content.items.map(item => item.str).join(' ')
              fullText += `\nSlide ${i}: ${pageText}`
            }

            resolve(fullText)
          } catch (err) {
            reject(err)
          }
        }

        script.onerror = () => reject(new Error('Could not load PDF reader'))

        // Only add script if not already loaded
        if (!window['pdfjs-dist/build/pdf']) {
          document.head.appendChild(script)
        } else {
          script.onload()
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}