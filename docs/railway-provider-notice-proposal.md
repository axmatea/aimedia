# Proposed provider notice update, pending owner approval

This is a proposed factual migration update, not a published privacy-policy change or legal advice. The live policy files remain exact recovered production source.

## Assumption requiring a decision

The website moves to Railway. Vercel website/funnel analytics collection is paused, with no replacement analytics vendor. Existing Cal scheduling, Notion CRM attribution, dedicated Cloudflare Worker/D1 duplicate prevention, and verified Meta CAPI remain configured under their current contracts. Real delivery remains subject to secure configuration and controlled validation.

## Proposed privacy-policy provider row

Replace the current Vercel hosting/analytics row with:

> Railway for website hosting and the technical request information needed to deliver and protect the website. Vercel website and funnel analytics collection is paused following the hosting migration.

Keep the other provider rows and the existing description of limited Meta conversion data unchanged.

## Proposed cookie/storage notice row

Replace the Vercel Analytics row with:

- Name: Website and funnel analytics
- Description: Vercel Analytics collection is paused following the hosting migration. Booking attribution and the existing conversion measurement described in our Privacy Policy continue where configured.
- Status: Paused

## Impact to approve

Vercel's page/funnel event dashboard will no longer receive new website events from Railway. Existing stored reports are not deleted by this code change. CRM booking attribution and Meta CAPI are separate paths and are preserved; they must still be validated with an owner-approved test. No new analytics recipient or tracking cookie is introduced. If a replacement analytics destination is selected instead, review its actual data handling and prepare corresponding wording before activation.

Apply only after the owner accepts the analytics reporting gap and approves this provider-description update. A final accuracy review is required against the actual deployed provider configuration.
