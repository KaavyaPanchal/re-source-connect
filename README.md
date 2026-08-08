# RE:SOURCE Connect

Build RE:SOURCE, a fully functional AI-powered resource coordination platform. This must be a real multi-user web application, not a simulation, static prototype, or fake dashboard.

PURPOSE

RE:SOURCE connects real surplus resources with real verified organizations that need them. Start with food waste and hunger, but architect the platform so it can later support other resources such as medical supplies, clothing, equipment, transportation, storage, and disaster-relief supplies.

The core principle is:

FIND → VERIFY → MATCH → COORDINATE → ACT → TRACK → IMPACT

The AI should actively assist with the entire workflow, while authorized users remain in control of real-world actions.

USERS & ROLES

Create authentication and role-based access.

1. SUPPLIER

Businesses, restaurants, supermarkets, farms, manufacturers, individuals, etc.

They can:

Create an organization profile

Add surplus resources

Edit quantities at any time

Update expiration dates

Update availability

Update location

Upload photographs/documents

Specify storage requirements

Mark resources as unavailable

Accept/reject matches

Approve transfers

See active and completed transfers

Receive notifications

2. RECIPIENT / ORGANIZATION

Food banks, NGOs, community organizations, shelters, schools, etc.

They can:

Create an organization profile

Submit resource needs

Specify quantity

Specify deadline

Specify acceptable alternatives

Specify storage capacity

Update needs in real time

Accept/reject proposed matches

Confirm receipt

Update actual quantity received

View previous transfers

3. LOGISTICS PROVIDER

They can:

Create a logistics profile

Add vehicles/capacity

Define service areas

Update availability

Accept transport requests

Update pickup status

Update transit status

Confirm delivery

4. ADMIN / VERIFICATION TEAM

They can:

Verify organizations

Review submitted documentation

Approve/reject accounts

Flag suspicious activity

Review transactions

Resolve disputes

Monitor platform activity

LIVE DATABASE

Use a real persistent database.

Do NOT hard-code the main application data.

Create tables/collections for:

Users

Organizations

Organization verification

Suppliers

Recipients

Logistics providers

Resources

Resource categories

Resource availability

Needs

Matches

Transfers

Transport assignments

Messages

Notifications

Documents

AI actions

Delivery confirmations

Impact metrics

Audit logs

Every user action must update the database immediately.

If Supplier A changes:

5,000 kg → 3,000 kg

the AI and matching system must use 3,000 kg, not the old value.

If Organization B marks its need as fulfilled, it must disappear from active matching.

REAL-TIME UPDATES

Use real-time database updates/websockets where supported.

If:

A supplier adds surplus

A recipient creates a need

A supplier changes quantity

A recipient changes deadline

A logistics provider becomes available

A transfer changes status

the relevant dashboards should update without manually rebuilding the application.

SUPPLIER EXPERIENCE

Create a simple interface:

ADD SURPLUS

Fields:

Resource type

Quantity

Unit

Expiration date

Pickup location

Availability start/end

Storage requirements

Condition

Description

Photos/documents

After submission, AI analyzes the listing.

Example:

5,000 kg rice
Ahmedabad
Expires in 4 days
Dry storage required

AI should automatically identify:

urgency

potential recipients

likely logistics requirements

possible matches

missing information

The supplier can edit everything later.

RECIPIENT EXPERIENCE

CREATE NEED

Fields:

Resource required

Quantity

Unit

Location

Deadline

Minimum acceptable quantity

Acceptable alternatives

Storage capacity

Delivery requirements

Purpose

Example:

Need 3,000–5,000 kg rice
Ahmedabad
Required within 5 days

AI should continuously compare active needs against available resources.

AI MATCHING ENGINE

This is the intelligence layer.

Continuously identify potential matches using:

Resource compatibility

Quantity

Distance

Expiration

Urgency

Recipient capacity

Storage requirements

Transportation availability

Cost

Reliability

Verification status

Expected impact

Do not simply rank by distance.

Explain why each match was selected.

Example:

96% MATCH

GreenMart Foods → Ahmedabad Community Food Network

5,000 kg rice

Why:

Exact resource match

Full quantity accepted

42 km distance

Storage available

Delivery possible before expiration

Both organizations verified

AI AGENT

The AI must have access to actual application tools/functions.

Implement tools such as:

Search available resources

Search active needs

Verify organization status

Compare resources and needs

Calculate logistics

Find available transport

Generate transfer plan

Generate documents

Send notifications

Create messages

Create transfer

Update transfer

Record delivery

Calculate impact

The AI should decide which tools to use based on the situation.

Users should be able to say:

“Find somewhere that can use this food.”

“Find the fastest available transport.”

“Prioritize this resource because it expires tomorrow.”

“Show me all urgent unmet needs within 100 km.”

“Build the best transfer.”

REAL-WORLD ACTIONS

The system must distinguish between:

AI PREPARING AN ACTION

and

AUTHORIZED USER APPROVING AN ACTION

The AI can prepare:

messages

transfer plans

pickup requests

delivery instructions

documentation

logistics requests

But sensitive real-world actions should require the appropriate user's confirmation.

Example:

AI:
“I found a recipient and transport provider. Execute this transfer?”

Buttons:

APPROVE & EXECUTE

EDIT

REJECT

Once approved, perform the connected action through available APIs/integrations.

Where an external API is unavailable, create a clear integration layer and a pending-action state rather than falsely claiming that the action occurred.

COMMUNICATION

Build an in-app communication system.

Suppliers, recipients, logistics providers and administrators can communicate about a transfer.

AI can:

draft messages

summarize conversations

identify missing information

suggest next actions

translate messages

notify users of important changes

Example:

“The recipient can only accept 3,500 kg. Would you like me to find another recipient for the remaining 1,500 kg?”

TRANSFER MANAGEMENT

Every transfer has a live status:

PROPOSED
→ ACCEPTED
→ SCHEDULED
→ PICKUP READY
→ PICKED UP
→ IN TRANSIT
→ DELIVERED
→ IMPACT VERIFIED

Authorized users can update statuses.

Require confirmation at important stages.

For delivery confirmation, allow:

recipient confirmation

actual quantity received

timestamp

photo/document upload

notes

optional GPS/location metadata where appropriate

Do not mark a transfer as successfully delivered merely because an AI said it was.

LOGISTICS

Create a logistics marketplace/network.

Transport providers can update:

vehicle type

capacity

availability

current service area

refrigeration capability

pricing

accepted jobs

The AI can match transportation to transfers.

For example:

5,000 kg rice
requires:

refrigeration: NO
capacity: 5 tonnes
distance: 42 km

AI finds available transport and proposes it.

DOCUMENTS

Automatically generate structured documents for each transfer where appropriate:

Resource manifest

Transfer summary

Pickup instructions

Delivery instructions

Recipient confirmation

Donation/transfer record

Allow authorized users to download and approve documents.

NOTIFICATIONS

Build notifications for:

New match

Match accepted

Match rejected

Expiring resource

New need

Transport accepted

Pickup scheduled

Delivery approaching

Delivery confirmed

Verification request

Missing information

URGENT RESOURCE SYSTEM

Create an AI-powered “At Risk” section.

Resources approaching expiration should automatically receive an urgency score.

Example:

CRITICAL

2,000 kg food
Expires in 14 hours

AI should proactively search for recipients and logistics.

The closer the expiration, the more aggressively it should search for viable solutions.

IMPACT TRACKING

Track actual completed outcomes.

Examples:

Food rescued

Quantity delivered

Organizations helped

Transfers completed

Estimated meals provided

Estimated waste avoided

Transport distance

Estimated emissions

People reached

Clearly distinguish:

ESTIMATED

from

VERIFIED

Never fabricate impact.

GLOBAL RESOURCE EXPANSION

Architect resources generically.

Do not hard-code the system around rice/food.

Resource categories should eventually support:

Food

Water

Medical supplies

Clothing

Equipment

Electronics

Storage

Transportation

Volunteer capacity

Professional skills

Food should simply be the first implementation.

MAP

Create an interactive map showing authorized/publicly shareable:

Resource locations

Active needs

Logistics providers

Active transfers

Protect sensitive recipient information.

Do not expose private addresses or vulnerable populations publicly.

SEARCH

Create global search.

Users can search:

“Rice near Ahmedabad”

“Urgent food needs within 50 km”

“Available refrigerated transport”

“Resources expiring this week”

Results must come from the live database.

DASHBOARDS

Supplier dashboard

Show:

Active surplus

Matches

Transfers

Expiring resources

Impact

Recipient dashboard

Show:

Active needs

Incoming resources

Pending matches

Transfers

Impact

Logistics dashboard

Show:

Available jobs

Active deliveries

Capacity

Completed deliveries

Admin dashboard

Show:

Verification queue

Active transfers

Flagged activity

Platform metrics

Impact

SECURITY & TRUST

Implement:

Authentication

Role-based permissions

Organization verification

Audit logs

Input validation

Secure file uploads

Database authorization rules

Protection against unauthorized updates

A supplier must NOT be able to edit another supplier's resources.

A recipient must NOT be able to edit another organization's needs.

Only authorized users can confirm deliveries.

AI SAFETY / TRUST

The AI must never invent:

available resources

organizations

deliveries

quantities

verification status

transportation

impact

Every important AI claim must be traceable to database information or an external verified source.

If information is missing:

say that it is missing.

If an action cannot actually be performed:

show it as pending rather than pretending it happened.

DESIGN

Make the application feel like a premium AI infrastructure company.

Not a charity website.

Use the RE:SOURCE logo.

Visual style:

clean

modern

minimal

premium

white/light background

charcoal typography

green primary accent

subtle blue/orange accents

smooth transitions

excellent typography

responsive design

accessible UI

Avoid:

generic stock photos

excessive gradients

clutter

fake statistics

unnecessary pages

CRITICAL REQUIREMENT

Build the actual application, not a presentation.

Every core feature must connect to the database.

Users must be able to create accounts, create organizations, add resources, update resources, create needs, update needs, accept/reject matches, communicate, approve transfers, update delivery status, upload confirmations, and see the changes reflected across the platform.

The AI must operate on the live application data.

The core experience must work end-to-end:

REAL USER
→ REAL RESOURCE
→ REAL NEED
→ AI MATCH
→ AI PLAN
→ USER APPROVAL
→ ACTION
→ LIVE TRANSFER
→ DELIVERY CONFIRMATION
→ VERIFIED IMPACT

Build this as a scalable foundation that could continue operating after the hackathon—not as a one-click demo.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9e1622f9-d5be-4ef4-87a5-b76e7b3c1b3d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
