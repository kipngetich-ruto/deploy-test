import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export const auth = betterAuth({
    // ------------------------- Better Auth Options -------------------------
    appName: process.env.APP_NAME,
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    secret: process.env.AUTH_SECRET!,

    // ------------------------- Database -------------------------
    database: drizzleAdapter(db, {
        provider: "pg",
    }),

    // ------------------------- Email & Password -------------------------
    emailAndPassword: {
        enabled: true,
    },

     // ------------------------- Social Providers -------------------------
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },
});