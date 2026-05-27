# htmx Testing Reference

## Server-Side Testing

```python
# Django test for htmx endpoint
def test_order_list_htmx(client):
    response = client.get('/orders/', HTTP_HX_REQUEST='true')
    assert response.status_code == 200
    assert 'HX-Trigger' in response.headers
    assert response['HX-Trigger'] == 'orderListUpdated'
```

## Client-Side Testing

```javascript
// Simulate htmx request
import { simulate } from 'htmx-test-utils';

test('click loads content', async () => {
  document.body.innerHTML = `
    <button hx-get="/api/orders" hx-target="#orders">
      Load Orders
    </button>
    <div id="orders"></div>
  `;
  
  htmx.process(document.body);
  await simulate(button, 'click');
  
  expect(document.getElementById('orders').innerHTML).toContain('Order 1');
});
```

## Key Points

- htmx endpoints return HTML fragments, not JSON
- HX-Request header identifies htmx requests on server
- HX-Trigger header fires client-side events after swap
- Test hx-target, hx-swap, and hx-trigger behaviors
- hx-indicator shows loading state during requests
- hx-vals sends additional parameters with requests
- Server-side tests verify conditional HTML rendering
- htmx processes new DOM content automatically
- hx-push-url updates browser history on navigation
- hx-boost enhances regular links and forms with AJAX
