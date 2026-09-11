require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development','production','test']).default('development'),
  PORT: z.string().default('3000'),
  MONGO_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),

  /**
   * Hand unauthenticated requests a demo identity.
   *
   * Off unless explicitly set to '1'. Opt-in rather than opt-out because the
   * failure modes are not symmetric: forgetting to switch it ON costs a demo,
   * forgetting to switch it OFF would give an org-admin identity to anyone.
   */
  ALLOW_DEMO_AUTH: z.string().optional().transform((v) => v === '1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('uploads'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
