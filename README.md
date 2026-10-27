# Hiring platform

A candidate-first hiring catalog. Candidates are coached and assessed, then listed anonymously. Business owners browse, sign an agreement to see who someone is, and pay one flat fee through Stripe when they decide to hire.

## Pages

| Address | Who | What |
| --- | --- | --- |
| `/` | Everyone | Home page |
| `/candidates` | Everyone | The catalog, with filters |
| `/candidates/[id]` | Everyone / signed owners | Anonymous profile, or the full profile once signed |
| `/candidates/[id]/unlock` | Owners | The agreement |
| `/login` | Owners | Sign in by emailed link |
| `/account` | Owners | Everyone they've signed for |
| `/apply` | Candidates | Free application |
| `/admin` | Heshy | Applications, listings, signatures, payments, refunds |
| `/admin/settings` | Heshy | Fee tiers |
| `/admin/activity` | Heshy | Log of everything that happened |

## Setup

1. **Database.** Create a Supabase project. Open SQL Editor, paste all of `supabase/schema.sql`, and run it.
2. **Environment variables.** Add every variable in `.env.example` to the Vercel project.
3. **Deploy.** Connect this repo to Vercel.
4. **Stripe webhook (recommended).** In Stripe, add a webhook to `SITE_URL/api/stripe/webhook` for `checkout.session.completed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## Before the first real owner signs

- Have a lawyer review the agreement in `src/lib/agreement.ts`, then change `AGREEMENT_VERSION`.
- Check employment-agency licensing in each state (and Israel) where you'll charge fees.

## How it's built

Next.js on Vercel, Supabase (Postgres + private file storage for resumes), Stripe Checkout, Resend for email. The browser never talks to the database; every read and write happens on the server with the service key, and every table has row-level security switched on with no public access.
