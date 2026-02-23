# SecurePay Site
# New Promotion Page
The **New Promotion Page** (`/admin/promotions/new_promotion`) is an Angular-based form for creating and editing promotions. It integrates with the backend via configurable API endpoints and supports several query parameters to control its behaviour.

## Location

- Route: `/admin/promotions/new_promotion`
- Component: `NewPromotionPageComponent`

## Query Parameters

The following query parameters can be appended to the URL:

| Parameter      | Description                                                                                  |
|----------------|----------------------------------------------------------------------------------------------|
| `PromotionId`  | Loads an existing promotion by its ID. If omitted, a new empty promotion form is displayed. |
| `default`      | When set to `true`, forces the component to use a predefined set of test API endpoints (useful for development/demo). |
| `delay`        | Adds an artificial delay (in milliseconds) before initialisation, e.g., `?delay=2000`.       |

Example:
```
/admin/promotions/new_promotion?PromotionId=123&default=true&delay=500
```

## Custom API Endpoints

By default, the component uses endpoints defined in the global variable `SecurePayApiEndpoints`. You can override these endpoints **before** the component initialises by setting:

```javascript
window.SecurePayApiEndpoints = {
  baseApiHost: 'your-api-host.com',
  promotionDataUrl: '/custom/path/to/promotion',
  hotelDataUrl: '/custom/path/to/initialisation',
  submitPromotionUrl: '/custom/path/to/submit'
};
```

If the `default=true` query parameter is present, the component will ignore the global setting and use internal test endpoints.

## Notes

- The form is built dynamically using Angular Reactive Forms and supports complex structures like categories, questions, pricing rules, and taxes.
- A live preview of the promotion (using `@unsonet/securepay-preview`) is displayed alongside the form.
- The component communicates with the parent frame via `postMessage` events (`promotion-init`, `promotion-ready`, `promotion-save`, `promotion-cancel`), making it suitable for embedding in an iframe.

For detailed API and integration, refer to the source code or internal documentation.