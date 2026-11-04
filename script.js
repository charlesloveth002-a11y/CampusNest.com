const SUPABASE_URL = "https://qclwmemnszqcbuvxwaiu.supabase.co";
const SUPABASE_KEY = "sb_publishable_mzCEnRxsDVHjs_gPyNtqcQ_ZXtT06yI";
const recoveringAtLoad = /type=recovery/.test(location.hash);
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isUrl = u => /^(https?:\/\/|[\w\-\/]+\.(jpe?g|png|webp)$)/i.test(u || "");
const mediaList = x => (x.photos && x.photos.length ? x.photos : (x.photo_url ? [x.photo_url] : [])).filter(isUrl);
const band = p => (p < 50000 ? "1" : p <= 100000 ? "2" : "3");

let bizRows = [], rooms = [], saved = new Set(), user = null, profile = null, premium = false;
let onlySaved = false, flt = { l: "", t: "", p: "" }, mode = "register";

function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.className = "toast show";
  setTimeout(() => (t.className = "toast"), 2000);
}

function waNumber(c) {
  let d = c.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  return d.length >= 11 ? d : "";
}
function phoneBtns(c, msg) {
  const tel = c.replace(/\s+/g, ""), wa = waNumber(c);
  return '<div class="cbtns">' + (wa ? '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + wa + "?text=" + encodeURIComponent(msg) + '">WhatsApp</a>' : "") +
    '<a class="btn dark" href="tel:' + esc(tel) + '">Call ' + esc(c) + "</a></div>";
}
function contactBtn(c, name) {
  if (!premium) return '<button class="btn dark" type="button" data-up="1">Upgrade to see contact</button>';
  if (!c) return '<a class="btn dark" href="mailto:charlesloveth002@gmail.com?subject=Room%20enquiry">Ask about this room</a>';
  if (c.includes("@")) return '<a class="btn dark" href="mailto:' + esc(c) + '">Email: ' + esc(c) + "</a>";
  return phoneBtns(c, "Hi, I found your listing" + (name ? ' "' + name + '"' : "") + " on CampusNest.");
}

/* ---------- Rooms ---------- */
async function loadRooms() {
  const { data, error } = await db.from("rooms").select("*").order("created_at", { ascending: false });
  if (error) { $("grid").innerHTML = '<div class="empty">Could not load rooms. Please refresh the page.</div>'; return; }
  rooms = (data || []).filter(r => r.status === "approved" && r.available);
  const locs = [...new Set(rooms.map(r => r.location))].sort();
  $("fLoc").innerHTML = '<option value="">Any location</option>' + locs.map(l => "<option>" + esc(l) + "</option>").join("");
  render();
}

function render() {
  let h = "", c = 0;
  rooms.forEach(r => {
    if (flt.l && r.location !== flt.l) return;
    if (flt.t && r.type !== flt.t) return;
    if (flt.p && band(Number(r.price)) !== flt.p) return;
    const on = saved.has(r.id);
    if (onlySaved && !on) return;
    c++;
    const pics = mediaList(r), mc = pics.length + (isUrl(r.video_url) ? 1 : 0);
    const photo = pics.length ? '<img src="' + esc(pics[0]) + '" alt="' + esc(r.name) + '" loading="lazy">' : "Photo coming soon";
    const gal = mc ? ' data-gal="room:' + r.id + '"' : "";
    const badge = mc > 1 ? '<span class="mcount">' + pics.length + " photo" + (pics.length === 1 ? "" : "s") + (isUrl(r.video_url) ? " + video" : "") + "</span>" : "";
    const chips = (r.amenities || "").split(",").map(a => a.trim()).filter(Boolean).map(a => "<span>" + esc(a) + "</span>").join("");
    h += '<article class="card"><div class="ph"' + gal + ">" + photo + badge +
      '<span class="tag">' + esc(r.type) + '</span>' +
      '<button class="heart' + (on ? " on" : "") + '" data-i="' + r.id + '" aria-label="Save this room">' + (on ? "♥" : "♡") + "</button></div>" +
      '<div class="in"><h3>' + esc(r.name) + "</h3><div>" + esc(r.location) + "</div>" +
      '<div class="price">₦' + Number(r.price).toLocaleString() + " / " + esc(r.price_period) + "</div>" +
      '<div class="chips">' + chips + "</div>" +
      (r.units > 1 ? '<div class="chips"><span>' + r.units + " rooms available</span></div>" : "") +
      (r.description ? '<p class="desc">' + esc(r.description) + "</p>" : "") +
      contactBtn(r.contact, r.name) +
      '<button class="reportbtn" type="button" data-rep="' + r.id + '">Report this listing</button></div></article>';
  });
  const none = rooms.length ? "No rooms match. Try a different filter" + (onlySaved ? ", or save a room with the heart." : ".") : "No rooms have been added yet. Please check back soon.";
  $("grid").innerHTML = c ? h : '<div class="empty">' + none + "</div>";
  $("cnt").textContent = saved.size;
}

let galItems = [], galIdx = 0;
function openGallery(key) {
  const [t, id] = key.split(":");
  const src = t === "room" ? rooms.find(r => String(r.id) === id) : bizRows.find(b => String(b.id) === id);
  if (!src) return;
  const list = mediaList(src).map(u => ({ t: "img", u }));
  if (isUrl(src.video_url)) list.push({ t: "vid", u: src.video_url });
  if (!list.length) return;
  galItems = list; galIdx = 0;
  drawGallery();
  $("galleryDlg").showModal();
}
function drawGallery() {
  const m = galItems[galIdx];
  $("galStage").innerHTML = m.t === "img" ? '<img src="' + esc(m.u) + '" alt="Listing photo">' : '<video src="' + esc(m.u) + '" controls playsinline></video>';
  $("galCount").textContent = (galIdx + 1) + " / " + galItems.length + (m.t === "vid" ? " (video)" : "");
}
$("galPrev").onclick = () => { galIdx = (galIdx - 1 + galItems.length) % galItems.length; drawGallery(); };
$("galNext").onclick = () => { galIdx = (galIdx + 1) % galItems.length; drawGallery(); };
$("galClose").onclick = () => $("galleryDlg").close();
$("galleryDlg").addEventListener("close", () => { $("galStage").innerHTML = ""; });
$("bizGrid").addEventListener("click", e => {
  const gl = e.target.closest("[data-gal]");
  if (gl) openGallery(gl.dataset.gal);
});

let reportId = null;
$("repCancel").onclick = () => $("reportDlg").close();
$("reportForm").onsubmit = async e => {
  e.preventDefault();
  const { error } = await db.from("reports").insert({ room_id: reportId, reason: $("repReason").value, details: $("repDetails").value.trim() || null });
  if (error) { $("repMsg").textContent = error.code === "23505" ? "You have already reported this listing. Thank you." : "Could not send: " + error.message; return; }
  $("reportDlg").close();
  e.target.reset();
  toast("Thanks. We will review this listing.");
};

async function upgrade() {
  if (!user) { showAuth("save"); return; }
  startPay("student", refreshUser);
}

$("grid").addEventListener("click", async e => {
  if (e.target.closest("[data-up]")) { upgrade(); return; }
  const gl = e.target.closest("[data-gal]");
  if (gl && !e.target.closest(".heart")) { openGallery(gl.dataset.gal); return; }
  const rp = e.target.closest("[data-rep]");
  if (rp) {
    if (!user) { showAuth("save"); return; }
    reportId = Number(rp.dataset.rep);
    $("repMsg").textContent = "";
    $("reportDlg").showModal();
    return;
  }
  const b = e.target.closest(".heart");
  if (!b) return;
  if (!user) { showAuth("save"); return; }
  if (!premium) { upgrade(); return; }
  const id = Number(b.dataset.i);
  if (saved.has(id)) {
    const { error } = await db.from("saved_rooms").delete().eq("room_id", id);
    if (!error) { saved.delete(id); toast("Removed from saved"); }
  } else {
    const { error } = await db.from("saved_rooms").insert({ room_id: id });
    if (!error) { saved.add(id); toast("Room saved"); }
  }
  render();
});

$("go").onclick = () => {
  flt = { l: $("fLoc").value, t: $("fType").value, p: $("fPrice").value };
  onlySaved = false;
  $("savedBtn").firstChild.nodeValue = "Show saved (";
  render();
  $("rooms").scrollIntoView();
};

$("savedBtn").onclick = () => {
  if (!user) { showAuth("save"); return; }
  onlySaved = !onlySaved;
  $("savedBtn").firstChild.nodeValue = onlySaved ? "Show all (" : "Show saved (";
  render();
};

/* ---------- Accounts ---------- */
let guest = false, authKind = "welcome";
try { guest = sessionStorage.getItem("cnGuest") === "1"; } catch (e) {}

function showLanding() { $("landView").hidden = false; $("formView").hidden = true; $("authScreen").scrollTop = 0; }
function openForm(m, note) {
  setMode(m);
  $("authForm").hidden = false;
  $("forgotBox").hidden = true;
  $("newPwBox").hidden = true;
  $("landView").hidden = true;
  $("formView").hidden = false;
  if (note) $("authSub").textContent = note;
  $("authScreen").scrollTop = 0;
}

function showAuth(kind) {
  const t = {
    welcome: ["Find Your Place. Feel at Home.", "Rooms, hostels and student shops, all in one place. Join free and start exploring."],
    out: ["You have been logged out", "Thanks for visiting CampusNest. Log back in any time, or keep browsing as a guest."]
  }[kind] || ["Find Your Place. Feel at Home.", ""];
  $("landTitle").textContent = t[0];
  $("landSub").textContent = t[1];
  $("authScreen").hidden = false;
  document.body.classList.add("lock");
  if (kind === "save") openForm("login", "Log in or create a free account to save rooms and see them on any device.");
  else showLanding();
}
function hideAuth() { $("authScreen").hidden = true; document.body.classList.remove("lock"); }

function setMode(m) {
  mode = m;
  const reg = m === "register";
  $("lblName").hidden = !reg;
  $("lblSchool").hidden = !reg;
  $("lblRole").hidden = !reg;
  $("lblTerms").hidden = !reg;
  $("aTerms").required = reg;
  $("forgotBtn").hidden = reg;
  $("aPass").autocomplete = reg ? "new-password" : "current-password";
  $("aName").required = reg;
  $("authSubmit").textContent = reg ? "Register" : "Log in";
  $("authTitle").textContent = reg ? "Create your account" : "Welcome back";
  $("authSub").textContent = reg ? "Join CampusNest to find rooms, save places and shop from students." : "Log in to see your saved rooms and listings.";
  $("authToggle").textContent = reg ? "Already have an account? Log in" : "New here? Register";
  $("authMsg").textContent = "";
}
$("authToggle").onclick = () => setMode(mode === "register" ? "login" : "register");

$("authForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("authMsg");
  msg.textContent = "Please wait...";
  const email = $("aMail").value.trim(), password = $("aPass").value;
  let res;
  if (mode === "register") {
    res = await db.auth.signUp({ email, password, options: { data: { full_name: $("aName").value.trim(), school: $("aSchool").value.trim(), role: $("aRole").value } } });
  } else {
    res = await db.auth.signInWithPassword({ email, password });
  }
  if (res.error) { msg.textContent = res.error.message; return; }
  if (mode === "register" && !res.data.session) { msg.textContent = "Account created. Check your email to confirm it, then log in."; return; }
  msg.textContent = "";
  authKind = "welcome";
  await refreshUser();
  window.scrollTo(0, 0);
  toast(mode === "register" ? "Welcome to CampusNest!" : "Welcome back!");
};

let rfBusy = false, rfAgain = false;
async function refreshUser() {
  if (rfBusy) { rfAgain = true; return; }
  rfBusy = true;
  try { await doRefresh(); } finally { rfBusy = false; }
  if (rfAgain) { rfAgain = false; await refreshUser(); }
}

async function doRefresh() {
  if (recovering) { showRecovery(); return; }
  const { data: { session } } = await db.auth.getSession();
  const u = session ? session.user : null;
  let p = null, s = new Set();
  if (u) {
    const pr = await db.from("profiles").select("full_name,is_admin,role,student_until,created_at").eq("id", u.id).maybeSingle();
    p = pr.data;
    const sr = await db.from("saved_rooms").select("room_id");
    (sr.data || []).forEach(r => s.add(r.room_id));
  }
  user = u; profile = p; saved = s;
  const isAdmin = !!(profile && profile.is_admin);
  const studentOk = !!(profile && profile.student_until && new Date(profile.student_until) > Date.now());
  premium = !!user && (isAdmin || (profile && profile.role === "agent") || studentOk);
  const first = ((profile && profile.full_name) || "").trim().split(/\s+/)[0];
  $("authBtn").textContent = user ? "Log out" : "Log in";
  $("adminLi").hidden = !isAdmin;
  $("agentLi").hidden = !(profile && profile.role === "agent");
  $("greet").hidden = !user;
  $("heroAdmin").hidden = !isAdmin;
  if (user) {
    $("greetName").textContent = first || user.email;
    const fresh = profile && profile.created_at && (Date.now() - new Date(profile.created_at)) < 10 * 60 * 1000;
    $("greetHello").textContent = fresh ? "Welcome to CampusNest," : "Welcome back,";
  }
  $("welcome").hidden = !user;
  $("loggedOutBox").hidden = !!user;
  if (user) $("welcomeName").textContent = (profile && profile.full_name) || user.email;
  if (!user) { onlySaved = false; $("savedBtn").firstChild.nodeValue = "Show saved ("; }
  const showUp = !!user && !premium;
  $("premiumBox").hidden = !(user && profile && profile.role === "student" && !isAdmin);
  if (!$("premiumBox").hidden) {
    const fee = await getFee();
    $("premiumText").textContent = studentOk
      ? "Premium active until " + new Date(profile.student_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + "."
      : "Free account. Upgrade for ₦" + fee.toLocaleString() + " (30 days) to save rooms, contact owners and see listed businesses.";
    $("upgradeBtn").textContent = studentOk ? "Extend 30 days" : "Upgrade";
  }
  render();
  loadBiz();
  if (user) hideAuth();
  else if (!guest && $("authScreen").hidden) showAuth(authKind);
}

async function logout() {
  await db.auth.signOut();
  guest = false;
  try { sessionStorage.removeItem("cnGuest"); } catch (e) {}
  authKind = "out";
  $("authForm").reset();
  window.scrollTo(0, 0);
  await refreshUser();
}

function showSaved() {
  onlySaved = true;
  $("savedBtn").firstChild.nodeValue = "Show all (";
  render();
  $("rooms").scrollIntoView();
}

$("authBtn").onclick = () => (user ? logout() : showAuth("welcome"));
$("logoutBtn").onclick = logout;
$("upgradeBtn").onclick = upgrade;
$("openAuth").onclick = () => showAuth("welcome");
$("landJoin").onclick = () => openForm("register");
$("landHave").onclick = () => openForm("login");
$("landLogin").onclick = () => openForm("login");
$("backBtn").onclick = showLanding;
let recovering = recoveringAtLoad;
function showRecovery() {
  $("authScreen").hidden = false;
  document.body.classList.add("lock");
  $("landView").hidden = true;
  $("formView").hidden = false;
  $("authForm").hidden = true;
  $("forgotBox").hidden = true;
  $("newPwBox").hidden = false;
  $("authTitle").textContent = "Set a new password";
  $("authSub").textContent = "Choose a new password for your account.";
}
$("forgotBtn").onclick = () => {
  $("authForm").hidden = true;
  $("forgotBox").hidden = false;
  $("fMsg").textContent = "";
  $("authTitle").textContent = "Reset your password";
  $("authSub").textContent = "Enter your email and we will send you a link.";
};
$("fBack").onclick = () => openForm("login");
$("fSend").onclick = async () => {
  const email = $("fMail").value.trim();
  if (!email) { $("fMsg").textContent = "Please type your email."; return; }
  $("fMsg").textContent = "Sending...";
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
  $("fMsg").textContent = error ? error.message : "If that email has an account, a reset link is on its way. Check your inbox and spam folder.";
};
$("npSave").onclick = async () => {
  const pw = $("npPass").value;
  if (pw.length < 6) { $("npMsg").textContent = "Use at least 6 characters."; return; }
  const { error } = await db.auth.updateUser({ password: pw });
  if (error) { $("npMsg").textContent = error.message; return; }
  recovering = false;
  history.replaceState(null, "", location.pathname + location.search);
  $("npPass").value = "";
  $("newPwBox").hidden = true;
  toast("Password updated");
  await refreshUser();
};
$("pwToggle").onclick = () => {
  const p = $("aPass"), show = p.type === "password";
  p.type = show ? "text" : "password";
  $("pwToggle").textContent = show ? "Hide" : "Show";
};
$("heroSaved").onclick = showSaved;
$("guestBtn").onclick = () => {
  guest = true;
  authKind = "welcome";
  try { sessionStorage.setItem("cnGuest", "1"); } catch (e) {}
  hideAuth();
};
db.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") { recovering = true; showRecovery(); return; }
  if (event === "TOKEN_REFRESHED") return;
  if (event === "SIGNED_IN" && session && user && session.user.id === user.id) return;
  setTimeout(refreshUser, 0);
});

/* ---------- Businesses ---------- */
function bizMedia(b) {
  const pics = mediaList(b), mc = pics.length + (isUrl(b.video_url) ? 1 : 0);
  if (!mc) return "";
  return '<div class="ph" data-gal="biz:' + b.id + '">' + (pics.length ? '<img src="' + esc(pics[0]) + '" alt="' + esc(b.business_name) + '" loading="lazy">' : "Video") +
    (mc > 1 ? '<span class="mcount">' + pics.length + " photo" + (pics.length === 1 ? "" : "s") + (isUrl(b.video_url) ? " + video" : "") + "</span>" : "") + "</div>";
}

async function loadFaq() {
  const { data } = await db.from("faqs").select("question,answer").order("position").order("id");
  if (!data || !data.length) return;
  $("faqList").innerHTML = data.map(f => "<details><summary>" + esc(f.question) + "</summary><p>" + esc(f.answer) + "</p></details>").join("");
}

async function loadBiz() {
  const { data, error } = await db.from("business_requests").select("id,business_name,category,details,contact_email,phone,photos,video_url").eq("paid", true).order("created_at", { ascending: false });
  if (error || !data || !data.length) { $("bizGrid").innerHTML = '<div class="empty">' + (premium ? "No businesses are listed yet." : "Upgrade to premium to see listed businesses.") + "</div>"; return; }
  bizRows = data;
  $("bizGrid").innerHTML = data.map(b =>
    '<article class="card">' + bizMedia(b) + '<div class="in"><h3>' + esc(b.business_name) + "</h3>" +
    (b.category ? '<div class="chips"><span>' + esc(b.category) + "</span></div>" : "") +
    (b.details ? '<p class="desc">' + esc(b.details) + "</p>" : "") +
    (b.contact_email ? '<a class="btn dark" href="mailto:' + esc(b.contact_email) + '">Email</a>' : "") +
    (b.phone ? phoneBtns(b.phone, "Hi, I found " + b.business_name + " on CampusNest.") : "") +
    "</div></article>").join("");
}

$("bizForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("bizMsg");
  msg.textContent = "Sending...";
  const { error } = await db.from("business_requests").insert({
    business_name: $("bName").value.trim(),
    category: $("bCat").value.trim(),
    details: $("bDetails").value.trim(),
    contact_email: $("bMail").value.trim(),
    phone: $("bPhone").value.trim()
  });
  if (error) { msg.textContent = "Could not send your request: " + error.message; return; }
  msg.textContent = "Request received. Your business will be listed after payment is confirmed.";
  e.target.reset();
};

/* ---------- Menu and start ---------- */
$("menu").onclick = function () {
  const o = $("links").classList.toggle("open");
  this.setAttribute("aria-expanded", o);
};
$("links").onclick = () => $("links").classList.remove("open");

setMode("register");
loadRooms();
loadBiz();
loadFaq();
refreshUser();
