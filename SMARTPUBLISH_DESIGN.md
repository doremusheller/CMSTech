# SmartPublish Product and Design Brief

## Product position

SmartPublish is a Signature Law-specific WordPress publishing and SEO operations layer. It should simplify and automate WordPress SaaS capabilities without replacing the lawyers as authors.

The product should feel familiar to WordPress users while reducing unnecessary configuration, technical friction, and publishing risk.

Core principle:

> SmartPublish does not write the lawyer's article. It helps the lawyer publish better, more discoverable, more consistent content with less technical friction.

## Primary user

The primary user is a live lawyer or authorized Signature Law content operator who writes the blog or legal content directly.

The system should preserve the user's authorship, legal judgment, and control over the content. SmartPublish provides structure, optimization guidance, validation, previews, and publishing controls.

AI drafting is intentionally excluded from the core workflow.

## User workflow

### 1. Write

The lawyer creates or pastes content in a familiar WordPress-style editor.

The editor should support:

- Title
- Body content
- Categories
- Tags
- Featured image
- Author
- Publish status
- Preview

### 2. Optimize

An SEO dashboard appears beside the editor and updates as the user works.

The dashboard should feel familiar to users of established WordPress SEO plugins, but be configured specifically for Signature Law.

### 3. Preview

The user sees realistic previews for:

- Search results
- Social sharing
- The published page
- Mobile and desktop presentation where useful

SEO title, meta description, slug, and social fields should update the relevant previews immediately.

### 4. Review

The system presents a clear checklist of issues and recommendations. It should explain what needs attention without rewriting legal content.

Each recommendation should show:

- What needs attention
- Why it matters
- Where the issue occurs
- What a good fix looks like
- A way to jump to the relevant field or section

### 5. Approve and publish

The authorized user controls the final publishing decision.

Possible states:

- Draft
- SEO review needed
- Attorney review needed
- Ready to publish
- Scheduled
- Published
- Refresh recommended

### 6. Monitor

After publishing, SmartPublish can monitor:

- Search impressions
- Click-through rate
- Ranking movement
- Page traffic
- Conversion activity
- Content needing refresh

## SEO dashboard design

The dashboard should use familiar panels rather than a dense technical control center.

Recommended panels:

- Document
- SEO
- Readability
- Schema
- Social sharing
- Internal links
- Media and accessibility
- Publish

Use plain status labels:

- Good
- Needs attention
- Missing
- Review recommended

A single SEO score may be useful as a summary, but it should not dominate the interface. The checklist and actionable explanations are more important than a score.

## SEO checks

### Content structure

- Clear primary topic
- Descriptive title
- Strong opening paragraph
- Useful subheadings
- Appropriate article length
- FAQ or summary section where appropriate

### Technical SEO

- Search-friendly slug
- SEO title length
- Meta description length
- Canonical URL
- Indexing status
- XML sitemap inclusion
- Open Graph metadata
- Social sharing metadata

### On-page relevance

- Topic appears naturally in the title
- Topic appears in the introduction
- Topic appears in relevant headings
- Related terms are present
- Content matches the intended search query

### Internal linking

- Links to related practice areas
- Links to attorney or firm pages
- Links to relevant contact pages
- No broken internal links
- Suggested anchor text
- Clear consultation or conversion path

### Media and accessibility

- Featured image selected
- Image alt text present
- Image appropriately sized
- Image compressed
- Accessible links and headings

### Legal-content safeguards

- Attorney review completed
- Jurisdiction is clear
- Date-sensitive information is flagged
- Disclaimer or consultation language is present when required
- No unsupported promise or outcome language

SmartPublish should flag these issues and guide the lawyer to fix them manually. It should not silently alter legal meaning.

## Search preview

The search preview should resemble a Google-style result and show:

- Page title
- URL or breadcrumb
- Meta description
- Optional practice-area label

The preview should update live as the user edits the SEO title, description, or slug.

## Templates

Templates provide structure without generating the lawyer's content.

Initial templates:

- Practice-area article
- Legal FAQ
- Attorney insight
- Case result
- Location page
- Firm announcement
- News commentary
- Resource guide

Templates can configure:

- Required fields
- Heading expectations
- Recommended schema
- SEO fields
- Internal-link targets
- Disclaimer requirements
- Featured-image dimensions
- Publishing checklist

## Schema types

Do not expose every possible schema type. Present a small Signature Law-specific set:

- Legal service
- Attorney profile
- Article
- FAQ
- Location
- Organization
- Event

## WordPress familiarity

SmartPublish should mirror familiar WordPress concepts while simplifying the experience:

- WordPress-style editor
- Document settings
- Categories and tags
- Featured image
- Draft and scheduled states
- Preview
- SEO panel
- Social panel
- Publish panel

The system should hide irrelevant configuration and establish Signature Law defaults automatically.

## Authentication and security

SmartPublish should follow the same platform pattern as SmartLedger and SmartWeb:

- Microsoft Entra authentication
- Role-aware access
- Client-specific permissions
- Approval controls
- Audit history
- Safe publishing boundary

The live Signature Law SmartPublish application should use the same Entra access model as the other client-facing modules.

## Technical build

The build will require:

- Entra-authenticated application shell
- WordPress REST API connection
- Signature Law content and page model
- WordPress post, page, media, taxonomy, and metadata handlers
- SEO validation rules
- Readability and content-structure checks
- Internal-link analysis
- Image and accessibility checks
- Schema configuration
- Search and social preview components
- Reusable content-template system
- Attorney approval and publishing states
- Audit logging
- Error handling and rollback behavior
- Optional analytics and content-refresh monitoring

## Suggested implementation phases

### Phase 1: Authenticated WordPress manager

- Entra sign-in
- WordPress connection
- Post and page listing
- Editor
- Draft, preview, and publish states
- Categories, tags, author, and media

### Phase 2: SEO dashboard

- SEO fields
- Search preview
- Basic title, slug, description, and structure checks
- Readability indicators
- Image and alt-text checks

### Phase 3: Signature Law templates

- Content templates
- Legal-content safeguards
- Schema presets
- Internal-link recommendations
- Required publishing checklist

### Phase 4: Approval-controlled publishing

- Attorney review state
- Approval history
- Scheduling
- Publishing logs
- Failure handling and rollback

### Phase 5: Monitoring

- Search and traffic metrics
- Ranking movement
- Conversion tracking
- Refresh recommendations
- Content performance dashboard

## Design direction

SmartPublish should feel like a polished extension of WordPress, not a generic enterprise administration tool.

Design qualities:

- Familiar layout
- Minimal decisions per screen
- Strong visual hierarchy
- Clear status states
- Inline explanations
- Live previews
- Calm, professional interface
- Signature Law-specific defaults
- Secure and reviewable publishing

The user should always understand:

1. What they are editing
2. What needs attention
3. Why it matters
4. What will happen when they publish
5. Who approved it
6. What was ultimately published

## Feasibility

This build is achievable incrementally.

The difficult engineering work is not basic WordPress connectivity or rendering an SEO checklist. The most important work is:

- Permissions
- Reliable publishing
- Legal-content safeguards
- SEO quality control
- Auditability
- Rollback behavior
- Clear separation between lawyer-authored content and system recommendations

The strongest initial product is a focused, opinionated publishing system for Signature Law—not a generic WordPress replacement.
