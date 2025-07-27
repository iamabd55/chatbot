export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, history, file } = req.body;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.API_KEY  // your Vercel environment variable
            },
            body: JSON.stringify({
                contents: [
                    ...history,
                    { role: "user", parts: [{ text: prompt }, ...(file ? [{ inline_data: file }] : [])] }
                ]
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error in API handler:', error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
}
