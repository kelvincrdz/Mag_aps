Go to database.new and create a new Supabase project.

Alternatively, you can create a project using the Management API:

# First, get your access token from https://supabase.com/dashboard/account/tokens

export SUPABASE_ACCESS_TOKEN="your-access-token"

# List your organizations to get the organization ID

curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
 https://api.supabase.com/v1/organizations

# Create a new project (replace <org-id> with your organization ID)

curl -X POST https://api.supabase.com/v1/projects \
 -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{
"organization_id": "<org-id>",
"name": "My Project",
"region": "us-east-1",
"db_pass": "<your-secure-password>"
}'
When your project is up and running, go to the Table Editor, create a new table and insert some data.

Alternatively, you can run the following snippet in your project's SQL Editor. This will create a instruments table with some sample data.

-- Create the table
create table instruments (
id bigint primary key generated always as identity,
name text not null
);
-- Insert some sample data into the table
insert into instruments (name)
values
('violin'),
('viola'),
('cello');
alter table instruments enable row level security;
Make the data in your table publicly readable by adding an RLS policy:

create policy "public can read instruments"
on public.instruments
for select to anon
using (true);
2
Create a Next.js app
Use the create-next-app command and the with-supabase template, to create a Next.js app pre-configured with:

Cookie-based Auth

TypeScript

Tailwind CSS

Explore drop-in UI components for your Supabase app.
UI components built on shadcn/ui that connect to Supabase via a single command.

Explore Components
npx create-next-app -e with-supabase
3
Declare Supabase Environment Variables
Rename .env.example to .env.local and populate with your Supabase connection variables:

Project URL
kelvincrdz's Org / mag
https://gmpavmyhfjfbqnggyrds.supabase.co

Publishable key
kelvincrdz's Org / mag
sb_publishable_wHRO9mHnwiWExgVtBZKQIQ_5G19Zpw0

Anon key
kelvincrdz's Org / mag
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGF2bXloZmpmYnFuZ2d5cmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODM2NTYsImV4cCI6MjA4MjU1OTY1Nn0.oE67COtkgZjPkbz1_UO_KcckHtZ0K7qQD8oyEiJGd0Y

.env.local
NEXT_PUBLIC_SUPABASE_URL=<SUBSTITUTE_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<SUBSTITUTE_SUPABASE_PUBLISHABLE_KEY>
You can also get the Project URL and key from the project's Connect dialog.

Changes to API keys
Supabase is changing the way keys work to improve project security and developer experience. You can read the full announcement, but in the transition period, you can use both the current anon and service_role keys and the new publishable key with the form sb_publishable_xxx which will replace the older keys.

In most cases, you can get the correct key from the Project's Connect dialog, but if you want a specific key, you can find all keys in the API Keys section of a Project's Settings page:

For legacy keys, copy the anon key for client-side operations and the service_role key for server-side operations from the Legacy API Keys tab.
For new keys, open the API Keys tab, if you don't have a publishable key already, click Create new API Keys, and copy the value from the Publishable key section.
Read the API keys docs for a full explanation of all key types and their uses.

4
Query Supabase data from Next.js
Create a new file at app/instruments/page.tsx and populate with the following.

This selects all the rows from the instruments table in Supabase and render them on the page.

app/instruments/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
async function InstrumentsData() {
const supabase = await createClient();
const { data: instruments } = await supabase.from("instruments").select();
return <pre>{JSON.stringify(instruments, null, 2)}</pre>;
}
export default function Instruments() {
return (
<Suspense fallback={<div>Loading instruments...</div>}>
<InstrumentsData />
</Suspense>
);
}
5
Start the app
Run the development server, go to http://localhost:3000/instruments in a browser and you should see the list of instruments.

npm run dev
