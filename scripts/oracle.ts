import fs from 'fs';
import path from 'path';
// Adapters imported individually below to avoid Next.js server dependencies
// Actually, importing from pages/api/check might be problematic if it contains Next.js specific response types or encryption logic mixed in.
// Let's refactor proper Clean Architecture later, but for now I will extract the regex patterns and logic or import Adapters if they are pure.
// Looking at `check.ts`, `Adapters` is defined inside or imported? 
// It was imported from `lib/adapters/...`.
// Let's look at `pages/api/check.ts` to see if `Adapters` is exported. 
// If not, I'll copy the list or export it.

// Let's assume I need to construct the adapter list again or import it.
// To ensure checking works without server, I'll re-import individual adapters.

import { OpenAIAdapter } from '../lib/adapters/openai';
import { AnthropicAdapter } from '../lib/adapters/anthropic';
import { GoogleAdapter } from '../lib/adapters/google';
import { StripeAdapter } from '../lib/adapters/stripe';
import { CohereAdapter } from '../lib/adapters/cohere';
import { HuggingFaceAdapter } from '../lib/adapters/huggingface';
import { MistralAdapter } from '../lib/adapters/mistral';
import { GroqAdapter } from '../lib/adapters/groq';
import { GitHubAdapter } from '../lib/adapters/github';
import { SlackAdapter } from '../lib/adapters/slack';
import { SendGridAdapter } from '../lib/adapters/sendgrid';
import { TelegramAdapter } from '../lib/adapters/telegram';
import { MapboxAdapter } from '../lib/adapters/mapbox';
import { NPMAdapter } from '../lib/adapters/npm';
import { HerokuAdapter } from '../lib/adapters/heroku';
import { ShodanAdapter } from '../lib/adapters/shodan';
import { TwilioAdapter } from '../lib/adapters/twilio';
import { MailgunAdapter } from '../lib/adapters/mailgun';
import { MailChimpAdapter } from '../lib/adapters/mailchimp';
import { GitLabAdapter } from '../lib/adapters/gitlab';
import { BitlyAdapter } from '../lib/adapters/bitly';
import { AWSAdapter } from '../lib/adapters/aws';
import { SupabaseAdapter } from '../lib/adapters/supabase';
import { ClerkAdapter } from '../lib/adapters/clerk';
import { DatabaseAdapter } from '../lib/adapters/database';
import { CloudinaryAdapter } from '../lib/adapters/cloudinary';
import { ResendAdapter } from '../lib/adapters/resend';
import { UpstashAdapter } from '../lib/adapters/upstash';
import { PusherAdapter } from '../lib/adapters/pusher';
import { checkLeak } from '../lib/services/leakChecker';

const Adapters = [
    OpenAIAdapter, AnthropicAdapter, GoogleAdapter, StripeAdapter, CohereAdapter,
    HuggingFaceAdapter, MistralAdapter, GroqAdapter, GitHubAdapter, SlackAdapter,
    SendGridAdapter, TelegramAdapter, MapboxAdapter, NPMAdapter, HerokuAdapter,
    ShodanAdapter, TwilioAdapter, MailgunAdapter, MailChimpAdapter, GitLabAdapter,
    BitlyAdapter, AWSAdapter, SupabaseAdapter, ClerkAdapter, DatabaseAdapter,
    CloudinaryAdapter, ResendAdapter, UpstashAdapter, PusherAdapter
];

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: ts-node scripts/oracle.ts <path-to-env-file>');
    process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf-8');
const lines = content.split('\n');

console.log(`\n🔮 Oracle CLI - Verifying secrets in ${path.basename(absolutePath)}...\n`);

async function check() {
    let checked = 0;
    let valid = 0;
    let invalid = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        // Simple var extraction
        const parts = line.split('=');
        if (parts.length < 2) continue;

        const key = parts.slice(1).join('=').replace(/["']/g, '').trim();
        const varName = parts[0].trim();

        // Skip non-secrets
        const adapter = Adapters.find(a => a.matches(key));
        if (adapter) {
            checked++;
            process.stdout.write(`Checking ${varName} (${adapter.name})... `);
            try {
                const result = await adapter.check(key);
                if (result.valid) {
                    // Leak Check
                    const leakStatus = await checkLeak(key);
                    if (leakStatus === 'leaked') {
                        console.log(`❌ INVALID (Leaked found in Public Code)`);
                        invalid++;
                    } else {
                        console.log(`✅ VALID`);
                        if (leakStatus === 'skipped') console.log(`   (Leak Check Skipped - Rate Limit)`);
                        if (result.usage) {
                            console.log(`   (Quota: $${result.usage.limit} / Used: $${result.usage.used})`);
                        }
                        if (result.metadata?.ratelimit) {
                            console.log(`   (Rate Limit: ${result.metadata.ratelimit})`);
                        }
                        valid++;
                    }
                } else {
                    console.log(`❌ INVALID (${result.message})`);
                    invalid++;
                }
            } catch (e) {
                console.log(`⚠️ ERROR (Network/System)`);
            }
        }
    }

    console.log(`\n---\nSummary: ${checked} Keys Checked. ${valid} Valid. ${invalid} Invalid.`);
    if (invalid > 0) process.exit(1); // Fail build
}

check();
