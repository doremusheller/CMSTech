# CMS Tech Analytics Bridge

Read-only Azure Function that retrieves CMS Tech metrics from Google Analytics 4 and Google Search Console. It is designed to sit behind Azure App Service Authentication (Easy Auth) with Microsoft Entra ID.

## Security boundary

- Never commit the Google service-account JSON.
- Store it in Azure application settings or Key Vault as `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Configure Easy Auth to require authentication for every request.
- Set `REQUIRE_ENTRA_AUTH=true` in Azure. The function rejects requests that do not contain the Easy Auth principal header.
- Restrict CORS to `https://cmstech.ai`.
- Grant the Google service identity Viewer access only to the CMS Tech GA4 property and Search Console property.

## Azure settings

| Setting | Value |
| --- | --- |
| `GOOGLE_ANALYTICS_PROPERTY_ID` | Numeric GA4 property ID, not the `G-` measurement ID |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | `https://www.cmstech.ai/` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Complete service-account JSON stored as a secret |
| `ALLOWED_ORIGIN` | `https://cmstech.ai` |
| `REQUIRE_ENTRA_AUTH` | `true` |

The endpoint is `GET /api/analytics`. Responses are cached in memory for 15 minutes.
