import type { NextApiRequest, NextApiResponse } from 'next'

// Placeholders - In production, use nodemailer
// import nodemailer from 'nodemailer'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const { subject, message } = req.body

    if (!subject || !message) {
        return res.status(400).json({ message: 'Missing fields' })
    }

    // Server-side logging (since we don't have SMTP creds yet)
    console.log('--- NEW SUGGESTION RECEIVED ---')
    console.log(`Subject: ${subject}`)
    console.log(`Message: ${message}`)
    console.log('-------------------------------')

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_PASS

    if (user && pass) {
        // TODO: Implement actual sending when credentials exist
        /*
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });
        await transporter.sendMail(...)
        */
        console.log('Credentials found but nodemailer not installed yet. Skipping send.')
    }

    // Return success so UI works
    return res.status(200).json({ success: true })
}
