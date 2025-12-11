import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const { subject, message, type = 'General', contact } = req.body

    if (!subject || !message) {
        return res.status(400).json({ message: 'Missing fields' })
    }

    // Server-side logging
    // console.log(`[Feedback] [${type}] ${subject}: ${message} (${contact || 'Anon'})`)

    // Color Logic
    const colors: Record<string, number> = {
        'Bug': 0xFF5252,    // Red
        'Feature': 0x448AFF, // Blue
        'General': 0x9E9E9E  // Gray
    }
    const embedColor = colors[type] || 0x9E9E9E

    // MODERN APPROACH: Discord/Slack Webhook
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL

    if (discordWebhook) {
        try {
            await fetch(discordWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: `[${type}] ${subject}`,
                        description: message,
                        color: embedColor,
                        fields: [
                            { name: 'Contact', value: contact || 'Anonymous', inline: true },
                            { name: 'Category', value: type, inline: true }
                        ],
                        footer: { text: 'Oracle Feedback System' },
                        timestamp: new Date().toISOString()
                    }]
                })
            })
            return res.status(200).json({ success: true, method: 'discord' })
        } catch (error) {
            console.error('Webhook failed:', error)
            return res.status(500).json({ success: false, message: 'Webhook Error' })
        }
    }

    // Fallback: If no webhook is set, we just log it (Mock Mode)
    // allowing the UI to show "Success" so you can test the frontend.
    return res.status(200).json({ success: true, method: 'log_only' })
}
