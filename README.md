# MediStore

> A modern medical store billing and inventory management system for daily pharmacy operations.

MediStore is a browser-based admin dashboard backed by Supabase. It combines inventory, customers, suppliers, billing, reports, printable invoices, and customer e-bill delivery in one focused workflow.

## Highlights

| Area | Features |
| --- | --- |
| Dashboard | Today's sales, medicine count, low-stock count, customers, recent transactions, and medicines expiring soon |
| Inventory | Add, edit, delete, search, filter, and monitor medicines with stock thresholds and expiry dates |
| Billing | Multi-item bills, quantities, percentage discounts, automatic totals, invoice storage, and stock reduction |
| E-bills | HTML invoices sent to the selected customer's email after successful billing |
| Customers | Profiles, contact details, email, date of birth, address, notes, and purchase totals |
| Suppliers | Company, contact, phone, email, address, GST, license, and linked medicines |
| Reports | Date-based sales reports, inventory summaries, low-stock alerts, expiry tracking, and stock value |
| Printing | Bill preview and printable invoice from newly created or saved bills |

## Features

### Dashboard

- Today's sales total
- Total medicines and customers
- Low-stock medicine count
- Recent billing transactions
- Medicines expiring within 30 days
- Quick navigation to billing and inventory

### Inventory management

- Medicine name, category, batch number, expiry date, quantity, and minimum stock level
- Purchase price and selling price tracking
- Optional supplier, manufacturer, and description
- Search by medicine name
- Filter by category, low stock, and out-of-stock status
- Low-stock and out-of-stock indicators
- Edit and delete actions
- Automatic quantity reduction after billing

### Billing workflow

1. Select a customer or choose a walk-in customer.
2. Select medicines and enter quantities.
3. Review line totals and subtotal.
4. Apply a percentage discount.
5. Generate and store the bill.
6. Reduce medicine stock and update the customer's purchase total.
7. Open the printable bill preview.
8. Send an e-bill when the customer has an email address.

E-bill delivery uses a themed status toast:

- Green when the email provider confirms acceptance.
- Red when the customer has no email or delivery fails.
- Automatically disappears after five seconds.

### Customer management

- Create, edit, search, and delete customer profiles
- Store email addresses for e-bill delivery
- Track total purchases
- Store optional medical notes, address, and date of birth

### Supplier management

- Create, edit, search, and delete suppliers
- Store company, contact person, phone, email, address, GST, and license information
- Link medicines to suppliers

### Reports and analytics

- Sales reports between selected dates
- Total sales, bill count, and average bill value
- Invoice-level sales history
- Inventory item count and total stock value
- Low-stock and expiring medicine counts
- In-stock, low-stock, out-of-stock, and expiring status badges

## Technology

- HTML5
- CSS3 with responsive layouts
- Vanilla JavaScript
- Supabase JavaScript client
- Supabase PostgreSQL
- Vercel hosting and Node.js serverless API
- Nodemailer with Gmail SMTP for e-bill delivery

## Project structure

```text
medical_store_billing/
|-- api/
|   `-- send-invoice-email.js       # Vercel Node.js email endpoint
|-- supabase/
|   `-- functions/
|       `-- send-invoice-email/     # Supabase Edge Function implementation
|-- app.js                          # UI, CRUD, billing, reports, and Supabase calls
|-- config.js                       # Supabase URL and publishable key
|-- index.html                      # Dashboard markup and modals
|-- styles.css                      # Application styling and responsive layout
|-- schema.sql                      # Tables, indexes, triggers, and RLS policies
|-- package.json                    # Node dependency configuration
|-- EMAIL_SETUP.md                  # Email configuration notes
`-- README.md                       # Project documentation
```

## Data model

The application stores data in five Supabase tables:

- `medicines`: inventory records and stock levels
- `customers`: customer profiles and purchase totals
- `suppliers`: supplier details
- `bills`: invoice headers, discounts, totals, and customer references
- `bill_items`: medicines and quantities belonging to each bill

The schema includes UUID keys, foreign keys, indexes, bill-item cascade deletion, timestamp triggers, sample data, and RLS policies for the current anonymous admin frontend.

## Local setup

### Requirements

- Node.js 18 or newer
- Python 3 or another local HTTP server
- A Supabase project
- A modern browser

### 1. Install dependencies

```powershell
npm install
```

### 2. Configure Supabase

Update `config.js` with your project URL and publishable key:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-publishable-key';
```

Use only a publishable/anon key in the browser. Never place a Supabase service-role or secret key in `config.js`.

### 3. Create the database

Open **Supabase Dashboard > SQL Editor**, paste the contents of `schema.sql`, and run it. GitHub does not execute SQL in Supabase automatically.

### 4. Run locally

From the project directory:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/`. If the server starts from the parent directory, open `http://localhost:8000/medical_store_billing/`.

## E-bill email setup

The frontend calls `/api/send-invoice-email`. The Vercel Node function sends an HTML invoice using Gmail SMTP through Nodemailer.

### Google account setup

1. Use a Gmail account you control as the sender.
2. Enable Google 2-Step Verification.
3. Open **Google Account > Security > App passwords**.
4. Create an app password named `MediStore`.
5. Copy the generated password without spaces.

### Vercel environment variables

In **Vercel > Project Settings > Environment Variables**, add these for Production:

```text
GMAIL_USER=youraccount@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
BILLING_FROM_EMAIL=MediStore <youraccount@gmail.com>
```

Keep credentials as **Secret** values. Never commit the Gmail app password to GitHub or place it in frontend JavaScript.

The endpoint returns `{ "sent": true }` only after Nodemailer successfully accepts the message. The green admin notification is shown only for that confirmed response.

## Deployment

### GitHub

From the nested project repository:

```powershell
git add .
git commit -m "Describe your change"
git push origin main
```

### Vercel

1. Import the GitHub repository into Vercel.
2. Add the three Gmail environment variables.
3. Deploy the project.
4. Allow Vercel to redeploy after future pushes.
5. Use `Ctrl + F5` when testing a fresh deployment.

The `api/send-invoice-email.js` file is automatically deployed as a Vercel serverless function. No separate Node server is required.

## Security notes

The current app is an admin-only frontend without an authentication screen. Its Supabase policies allow the `anon` role to manage application tables so the existing UI can read and write data.

Before using real patient or customer data, add authentication and replace the public RLS policies with user- or role-based policies. Also consider audit logs, server-side permission checks, and authenticated access to medical notes and personal data.

Rotate any credential immediately if it is ever shared or committed.

## Demo data

The inventory can be populated with common demonstration records such as:

- Paracetamol 500mg
- Amoxicillin 500mg
- Cetirizine 10mg
- Ibuprofen 400mg
- Omeprazole 20mg
- Azithromycin 500mg
- ORS Orange
- Cough Syrup 100ml
- Vitamin C 500mg
- Antiseptic Cream 20g

Use clearly labeled demo records for presentations. They are not medical advice or prescribing guidance.

## Troubleshooting

### RLS violation when saving a record

Run the current `schema.sql` in Supabase SQL Editor. Database policies must exist in the live Supabase project; GitHub alone does not apply SQL changes.

### E-bill is not sent

Check that the customer has a valid email, the Gmail variables are correct, the app password is a Google app password, the variables are enabled for Production, and Vercel has redeployed after they were added.

### Old popup or UI still appears

Wait for the Vercel deployment to finish, then reload with `Ctrl + F5` and confirm Vercel is connected to the latest GitHub commit.

## License

This project does not currently declare a license. Add a license before distributing it publicly.
