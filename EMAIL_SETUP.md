# E-bill email setup

The app sends an e-bill after a bill is saved, when the selected customer has an email address.

## 1. Choose an email provider

For sending to arbitrary customer email addresses without owning a domain, the Vercel function now uses Gmail SMTP through Nodemailer. Use a Gmail account you control and create a Google App Password.

Configure Vercel environment variables:

```text
GMAIL_USER=youraccount@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
BILLING_FROM_EMAIL=MediStore <youraccount@gmail.com>
```

Customers can have any email provider.

Resend is also supported, but its `onboarding@resend.dev` testing sender can only deliver to the email address associated with your Resend account. Resend production delivery requires a verified domain.

## 2. Gmail setup

In your Google Account, enable 2-Step Verification, open **Security > App passwords**, create an app password named `MediStore`, and copy the generated 16-character password into Vercel. Do not use your normal Gmail password.

## 3. Resend alternative

Create a Resend account at https://resend.com, create an API key, and verify the domain used as the sender. For testing, Resend may require sending only to the account email until a domain is verified.

## 4. Install and log in to Supabase CLI

From the `medical_store_billing` directory:

```powershell
supabase login
supabase link --project-ref unhsplxfuzeasuzshlfa
```

## 5. Configure Resend secrets

Replace the values with your own Resend credentials. Do not put them in `config.js` or the frontend.

```powershell
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set BILLING_FROM_EMAIL="MediStore <billing@your-verified-domain.com>"
```

## 6. Deploy the email function

```powershell
supabase functions deploy send-invoice-email
```

The function is located at `supabase/functions/send-invoice-email/index.ts`.

## 7. Test

Add a customer with a valid email address, create a bill for that customer, and check the inbox. A bill for a walk-in customer or a customer without an email is still saved normally, but no email is sent.
