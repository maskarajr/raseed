#!/usr/bin/env bash
# End-to-end API smoke test: login -> offline sync -> admin approve -> stock deduct.
set -euo pipefail
API=http://localhost:3001
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "== 1. health =="
curl -sf $API/health >/dev/null && pass "health ok" || fail "health"

echo "== 2. admin login =="
ADMIN=$(curl -sf -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@wholesale.local","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r .access_token)
[ "$ADMIN_TOKEN" != "null" ] && pass "admin token acquired" || fail "admin login: $ADMIN"

echo "== 3. salesman login =="
SALES=$(curl -sf -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ali@shop.com","password":"salesman123"}')
SALES_TOKEN=$(echo "$SALES" | jq -r .access_token)
[ "$SALES_TOKEN" != "null" ] && pass "salesman token acquired" || fail "salesman login: $SALES"

echo "== 4. products list + capture first product =="
PRODUCTS=$(curl -sf $API/products -H "Authorization: Bearer $SALES_TOKEN")
PID=$(echo "$PRODUCTS" | jq -r '.data[0].id')
PNAME=$(echo "$PRODUCTS" | jq -r '.data[0].name')
STOCK_BEFORE=$(echo "$PRODUCTS" | jq -r '.data[0].stock_qty')
AVAIL_BEFORE=$(echo "$PRODUCTS" | jq -r '.data[0].available_qty')
echo "  product=$PNAME stock_before=$STOCK_BEFORE avail_before=$AVAIL_BEFORE"
[ "$PID" != "null" ] && pass "products fetched" || fail "products: $PRODUCTS"

echo "== 5. salesman sync push (offline invoice, new customer) =="
LOCAL_ID="dev-e2e_$(date +%s)_$RANDOM"
NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
PUSH=$(curl -sf -X POST $API/sync/push -H "Authorization: Bearer $SALES_TOKEN" -H 'Content-Type: application/json' -d "{
  \"device_id\": \"dev-e2e\",
  \"records\": [{ \"type\":\"invoice\", \"payload\": {
    \"new_customer\": { \"name\":\"E2E Store\", \"phone\":\"03009998877\" },
    \"items\": [{ \"product_id\":\"$PID\", \"qty\":3, \"unit_price\":2200 }],
    \"notes\": \"e2e test invoice\",
    \"local_id\": \"$LOCAL_ID\",
    \"created_at_device\": \"$NOW\"
  }}]
}")
STATUS=$(echo "$PUSH" | jq -r '.processed[0].status')
SERVER_ID=$(echo "$PUSH" | jq -r '.processed[0].server_id')
[ "$STATUS" = "created" ] && pass "invoice synced (created) server_id=$SERVER_ID" || fail "sync push: $PUSH"

echo "== 6. idempotency: re-push same local_id -> duplicate =="
PUSH2=$(curl -sf -X POST $API/sync/push -H "Authorization: Bearer $SALES_TOKEN" -H 'Content-Type: application/json' -d "{
  \"device_id\": \"dev-e2e\",
  \"records\": [{ \"type\":\"invoice\", \"payload\": {
    \"new_customer\": { \"name\":\"E2E Store\", \"phone\":\"03009998877\" },
    \"items\": [{ \"product_id\":\"$PID\", \"qty\":3, \"unit_price\":2200 }],
    \"local_id\": \"$LOCAL_ID\", \"created_at_device\": \"$NOW\"
  }}]
}")
STATUS2=$(echo "$PUSH2" | jq -r '.processed[0].status')
[ "$STATUS2" = "duplicate" ] && pass "idempotency enforced (duplicate)" || fail "idempotency: $PUSH2"

echo "== 7. stock reserved after pending invoice =="
AVAIL_RESERVED=$(curl -sf $API/products -H "Authorization: Bearer $SALES_TOKEN" | jq -r ".data[] | select(.id==\"$PID\") | .available_qty")
echo "  available_after_reserve=$AVAIL_RESERVED (expected $((AVAIL_BEFORE-3)))"
[ "$AVAIL_RESERVED" = "$((AVAIL_BEFORE-3))" ] && pass "reserved_qty applied" || fail "reservation wrong"

echo "== 8. admin sees pending invoice =="
PENDING=$(curl -sf "$API/invoices?status=pending" -H "Authorization: Bearer $ADMIN_TOKEN")
FOUND=$(echo "$PENDING" | jq -r "[.data[] | select(.id==\"$SERVER_ID\")] | length")
[ "$FOUND" = "1" ] && pass "admin sees pending invoice" || fail "pending list: $PENDING"

echo "== 9. salesman cannot approve (403) =="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$API/invoices/$SERVER_ID/approve" -H "Authorization: Bearer $SALES_TOKEN")
[ "$CODE" = "403" ] && pass "salesman approve forbidden (403)" || fail "expected 403 got $CODE"

echo "== 10. admin approves -> stock hard-deducted =="
APPROVE=$(curl -sf -X PATCH "$API/invoices/$SERVER_ID/approve" -H "Authorization: Bearer $ADMIN_TOKEN")
ASTATUS=$(echo "$APPROVE" | jq -r '.status')
[ "$ASTATUS" = "approved" ] && pass "invoice approved" || fail "approve: $APPROVE"
STOCK_AFTER=$(curl -sf $API/products -H "Authorization: Bearer $SALES_TOKEN" | jq -r ".data[] | select(.id==\"$PID\") | .stock_qty")
echo "  stock_after=$STOCK_AFTER (expected $((STOCK_BEFORE-3)))"
[ "$STOCK_AFTER" = "$((STOCK_BEFORE-3))" ] && pass "stock hard-deducted on approval" || fail "stock deduction wrong"

echo "== 11. salesman pull sees approved status =="
PULL=$(curl -sf "$API/sync/pull" -H "Authorization: Bearer $SALES_TOKEN")
USTATUS=$(echo "$PULL" | jq -r ".invoice_updates[] | select(.server_id==\"$SERVER_ID\") | .status")
[ "$USTATUS" = "approved" ] && pass "salesman pull reflects approval" || fail "pull: $USTATUS"

echo "== 12. analytics summary =="
SUM=$(curl -sf "$API/analytics/summary" -H "Authorization: Bearer $ADMIN_TOKEN")
echo "  summary=$SUM"
echo "$SUM" | jq -e '.total_revenue >= 0' >/dev/null && pass "analytics summary ok" || fail "summary"

echo ""
echo "ALL E2E CHECKS PASSED"
