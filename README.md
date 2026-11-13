# Game Tribe - Official Website

The official website and event management platform for **Game Tribe**, a community-driven gaming and entertainment experience built around bringing people together through games, competitions, and shared experiences.

**Website:** [gametribeng.com](https://gametribeng.com)

## Overview

The Game Tribe website provides visitors with information about upcoming events, ticket options, activities, sponsors, past editions, and partnership opportunities.

It also includes an administrative dashboard for managing website content, ticket sales, attendee information, and event operations.

The platform is built to support both the public-facing website and the operational needs of the event team.

## Key Features

### Public Website
- Event information, dates, venue details, and countdown.
- Ticket listings and online payments.
- About, Memories, FAQs, Contact, and Partner pages.
- Sponsor, media, vendor, and partner showcases.
- Photo and video galleries.
- Game Tribe Live access page.
- Ticket lookup and ticket information pages.

### Admin Dashboard
- Website content management.
- Event information and page updates.
- Ticket types, pricing, and availability management.
- Sales and attendee records.
- Ticket verification and QR code scanning.
- Gate check-in management.
- Complimentary ticket management.
- Team access and role management.
- Announcements and waitlist management.
- Basic platform health and security monitoring.

### Payments and Tickets
- Online ticket checkout.
- Payment verification.
- Digital ticket delivery.
- QR-based ticket verification.
- Support for multiple tickets in one order.
- Attendee check-in tracking.

## Technology

The project uses a combination of:

- HTML, CSS, and JavaScript for the website interface.
- Serverless functions for backend operations.
- Supabase for database and media storage.
- Paystack for payment processing.
- Vercel for hosting and deployment.
- Resend for transactional email delivery.

## Project Structure

```text
/
├── index.html
├── about/
├── memories/
├── faq/
├── contact/
├── partner/
├── play/
├── admin/
├── assets/
├── api/
├── supabase/
├── vercel.json
└── README.md
```

The folders contain the public website pages, shared assets, administrative interface, backend endpoints, and database setup resources.

## Getting Started

### Requirements

Before setting up the project, ensure you have:

- Node.js installed.
- A GitHub account.
- A Vercel account.
- A Supabase project.
- A Paystack account for payment functionality.
- An email delivery provider configured for transactional messages.

### Installation

1. Clone the repository:

   ```bash
   git clone YOUR_REPOSITORY_URL
   ```

2. Enter the project directory:

   ```bash
   cd YOUR_PROJECT_FOLDER
   ```

3. Install dependencies if the project includes a package configuration:

   ```bash
   npm install
   ```

4. Configure the required environment variables in your hosting provider.

5. Set up the database using the appropriate SQL setup files in the `supabase` directory.

6. Deploy the project through Vercel.

For deployment-specific configuration, refer to the project's private setup documentation.

## Deployment

The website is designed to deploy through Vercel.

A typical deployment workflow is:

1. Push approved changes to the connected GitHub repository.
2. Allow Vercel to build and deploy the latest version.
3. Review the deployment status.
4. Test the public website and administrative dashboard.
5. Confirm that essential features are working before publishing changes to the live event platform.

## Administration

The administrative dashboard is available through:

```text
/admin
```

Access is restricted to authorized administrators and team members.

The dashboard is used to manage website content, ticket information, event operations, and attendee records.

## Development Guidelines

When contributing to this project:

- Preserve the existing design system and visual consistency.
- Avoid changing payment-related functionality without testing it.
- Do not expose private credentials or configuration values in frontend code.
- Keep sensitive configuration in environment variables.
- Test changes on a preview deployment before releasing them.
- Avoid removing existing functionality without checking its dependencies.
- Keep the public website and administrative dashboard compatible.

## Security

Security and data protection are important to the platform.

- Never commit API keys, passwords, access tokens, or private credentials.
- Do not expose private backend configuration in public-facing code.
- Restrict administrative access to authorized users.
- Review changes to payment, authentication, and attendee-management functionality carefully.
- Report potential security issues privately rather than publishing sensitive details.

## Important Notes

- Some features depend on external services and may require valid service configurations.
- Payment and ticket functionality should be tested in a safe environment before production deployment.
- Database changes should be reviewed before being applied to the live project.
- The project contains operational functionality that should not be modified casually.

## License

Unless otherwise specified, the codebase and associated Game Tribe branding, content, and materials are proprietary to the Game Tribe project.

Permission is required before redistributing, reusing, or commercially exploiting proprietary materials.

---

**Game Tribe**

*Play Together. Compete Together. Celebrate Together.*
