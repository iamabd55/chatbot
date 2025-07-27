export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, history, file, model } = req.body;
    const selectedModel = model && model.trim() !== "" ? model : 'gemini-2.5-flash-lite';

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.API_KEY
                },
                body: JSON.stringify({
                    contents: [
                        ...history,
                        {
                            role: "user",
                            parts: [
                                { text: prompt },
                                ...(file ? [{ inline_data: file }] : [])
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error in API handler:', error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
}
