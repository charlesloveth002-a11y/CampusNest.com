// Paste your Paystack PUBLIC key between the quotes (it starts with pk_test_ or pk_live_).
// Never paste the secret key (sk_...) here.
const PAYSTACK_PUBLIC_KEY = "";

async function getFee() {
  const { data } = await db.from("settings").select("value").eq("key", "listing_fee").maybeSingle();
  return Number(data && data.value) || 1500;
}

// kind: "housing" (accommodation posting), "business" (business posting) or "student" (student premium)
async function startPay(kind, done) {
  if (!PAYSTACK_PUBLIC_KEY) { alert("Online payment is not switched on yet. Please pay by bank transfer."); return; }
  const { data: { session } } = await db.auth.getSession();
  if (!session) { alert("Please log in first."); return; }
  const fee = await getFee();
  const ref = "CN" + Date.now() + Math.floor(Math.random() * 1000);
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: session.user.email,
    amount: fee * 100,
    currency: "NGN",
    ref: ref,
    metadata: { user_id: session.user.id, kind: kind },
    callback: function (r) { verifyPay(r.reference, kind, done); },
    onClose: function () {}
  });
  handler.openIframe();
}

async function verifyPay(reference, kind, done) {
  const { data, error } = await db.functions.invoke("verify-payment", { body: { reference: reference, kind: kind } });
  if (error || !data || !data.ok) {
    alert("We could not confirm your payment yet. Please keep this reference and contact CampusNest: " + reference);
    return;
  }
  alert("Payment confirmed. Thank you!");
  if (done) done();
}
