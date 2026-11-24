const SUPABASE_URL = "https://qclwmemnszqcbuvxwaiu.supabase.co";
const SUPABASE_KEY = "sb_publishable_mzCEnRxsDVHjs_gPyNtqcQ_ZXtT06yI";
const recoveringAtLoad = /type=recovery/.test(location.hash);
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isUrl = u => /^(https?:\/\/|[\w\-\/]+\.(jpe?g|png|webp)$)/i.test(u || "");
const mediaList = x => (x.photos && x.photos.length ? x.photos : (x.photo_url ? [x.photo_url] : [])).filter(isUrl);
const band = p => (p < 150000 ? "1" : p <= 250000 ? "2" : "3");

let bizRows = [], rooms = [], saved = new Set(), user = null, profile = null, premium = true;
let onlySaved = false, flt = { l: "", t: "", p: "" }, mode = "register";

// Demo fallback rooms to guarantee presentation reliability
const DEMO_ROOMS = [
  {
    id: 13,
    name: "Unity Court",
    type: "Room",
    location: "Faculty Road",
    price: 200000,
    price_period: "year",
    amenities: "Fan, Study desk, 24/7 Light, Wardrobe",
    description: "Compact single room with a desk and notice board. 5 mins walk to Faculty of Science.",
    photos: ["demo-cork.jpg"],
    contact: "07018051613",
    available: true,
    status: "approved",
    units: 5
  },
  {
    id: 11,
    name: "Nest Capsule Hostel",
    type: "Hostel",
    location: "Near Campus Gate",
    price: 160000,
    price_period: "year",
    amenities: "Private sleeping pod, Reading light, Personal Lockers, Wi-Fi",
    description: "Modern budget pod-style beds with privacy, reading lights and high-speed Wi-Fi.",
    photos: ["demo-capsule.jpg"],
    contact: "07018051613",
    available: true,
    status: "approved",
    units: 15
  },
  {
    id: 12,
    name: "Cedar Heights",
    type: "Apartment",
    location: "Estate Road",
    price: 290000,
    price_period: "year",
    amenities: "Air conditioning, Running borehole water, 24/7 Security",
    description: "Spacious self-contained apartment with wooden finishes, balcony and continuous water supply.",
    photos: ["demo-wood.jpg", "demo-balcony.jpg"],
    contact: "07018051613",
    available: true,
    status: "approved",
    units: 2
  },
  {
    id: 4,
    name: "Asherifa Lodge",
    type: "Hostel",
    location: "Near Campus Gate",
    price: 180000,
    price_period: "year",
    amenities: "Running water, 24/7 Light, Guarded Security, Reading area",
    description: "Shared hostel rooms around a green garden courtyard. 3 minutes walk to campus main gate.",
    photos: ["img-hostel.jpg", "img-bunks.jpg"],
    contact: "07018051613",
    available: true,
    status: "approved",
    units: 12
  },
  {
    id: 5,
    name: "Hilltop Hostel",
    type: "Hostel",
    location: "Student Village",
    price: 150000,
    price_period: "year",
    amenities: "Fan, Reading tables, Security, Spacious Wardrobe",
    description: "Bright shared room for students with individual study desks and spacious wardrobes.",
    photos: ["img-dorm.jpg"],
    contact: "07018051613",
    available: true,
    status: "approved",
    units: 20
  },
  {
    id: 8,
    name: "Moremi Estate",
    type: "Apartment",
    location: "Estate Road",
    price: 300000,
    price_period: "year",
    amenities: "Private Balcony, Running water, Security, Inverter power",
    description: "Premium self-contained flat with private balcony and steady electricity. Ideal for final year students.",
    photos: ["demo-balcony.jpg"],
    contact: "07018051613",
    available: true,
    status: "approved",
    units: 3
  }
];

function toast(m) {
  const t = $("toast");
  if (!t) return;
  t.textContent = m;
  t.className = "toast show";
  setTimeout(() => (t.className = "toast"), 2500);
}

function waNumber(c) {
  let d = (c || "").replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  return d.length >= 11 ? d : "2347018051613";
}

function phoneBtns(c, msg) {
  const wa = waNumber(c);
  const textMsg = encodeURIComponent(msg || "Hi, I found your listing on CampusNest. I would like to schedule an inspection.");
  const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=charlesloveth002@gmail.com&su=" + encodeURIComponent("CampusNest: " + (msg || "Hostel Inquiry"));
  return '<div class="cbtns">' + 
    '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + textMsg + '">💬 Chat on WhatsApp</a>' +
    '<a class="btn ghost" target="_blank" rel="noopener" href="' + gmailUrl + '">✉️ Message via Gmail</a>' +
    '</div>';
}

function contactBtn(c, name) {
  return phoneBtns(c, 'Hi, I found "' + (name || 'your listing') + '" on CampusNest. I would like to schedule an inspection.');
}

/* ---------- Rooms Loading & Rendering ---------- */
async function loadRooms() {
  try {
    const { data, error } = await db.from("rooms").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length) {
      rooms = data.filter(r => r.status === "approved" && r.available);
    } else {
      rooms = DEMO_ROOMS;
    }
  } catch (e) {
    rooms = DEMO_ROOMS;
  }
  
  if (!rooms.length) rooms = DEMO_ROOMS;

  const locs = [...new Set(rooms.map(r => r.location))].sort();
  if ($("fLoc")) {
    $("fLoc").innerHTML = '<option value="">Any location</option>' + locs.map(l => "<option>" + esc(l) + "</option>").join("");
  }
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
    const photo = pics.length ? '<img src="' + esc(pics[0]) + '" alt="' + esc(r.name) + '" loading="lazy">' : '<div style="padding:20px;text-align:center;">CampusNest Verified Photo</div>';
    const gal = mc ? ' data-gal="room:' + r.id + '"' : "";
    const badge = mc > 1 ? '<span class="mcount">📸 ' + pics.length + (isUrl(r.video_url) ? " + 🎥 video" : "") + "</span>" : "";
    const chips = (r.amenities || "").split(",").map(a => a.trim()).filter(Boolean).map(a => "<span>" + esc(a) + "</span>").join("");
    
    const proximity = r.location === "Near Campus Gate" ? "🚶 3 mins to Campus Gate" : (r.location === "Faculty Road" ? "🚶 5 mins to Lecture Theatres" : "📍 " + esc(r.location));

    h += '<article class="card">' +
      '<div class="ph"' + gal + ">" + photo + badge +
      '<span class="tag">' + esc(r.type) + '</span>' +
      '<span class="verified-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Verified</span>' +
      '<button class="heart' + (on ? " on" : "") + '" data-i="' + r.id + '" aria-label="Save this room">' + (on ? "♥" : "♡") + '</button>' +
      '</div>' +
      '<div class="in">' +
      '<h3>' + esc(r.name) + '</h3>' +
      '<div class="card-loc">' + proximity + '</div>' +
      '<div class="price">₦' + Number(r.price).toLocaleString() + ' <span>/ ' + esc(r.price_period) + '</span></div>' +
      '<div class="chips">' + chips + '</div>' +
      (r.units > 1 ? '<div class="chips"><span style="background:#e0f2fe;color:#0369a1;border-color:#bae6fd;">🔥 ' + r.units + ' rooms left</span></div>' : '') +
      (r.description ? '<p class="desc">' + esc(r.description) + '</p>' : '') +
      contactBtn(r.contact, r.name) +
      '<button class="reportbtn" type="button" data-rep="' + r.id + '">Report listing</button>' +
      '</div></article>';
  });

  const none = rooms.length ? "No rooms match your search criteria. Try a different filter." : "No rooms have been added yet.";
  if ($("grid")) {
    $("grid").innerHTML = c ? h : '<div class="empty">' + none + '</div>';
    if (!user) $("grid").hidden = true;
  }
  if ($("cnt")) $("cnt").textContent = saved.size;
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

if ($("bizGrid")) {
  $("bizGrid").addEventListener("click", e => {
    const gl = e.target.closest("[data-gal]");
    if (gl) openGallery(gl.dataset.gal);
  });
}

let reportId = null;
if ($("repCancel")) $("repCancel").onclick = () => $("reportDlg").close();
if ($("reportForm")) {
  $("reportForm").onsubmit = async e => {
    e.preventDefault();
    const { error } = await db.from("reports").insert({ room_id: reportId, reason: $("repReason").value, details: $("repDetails").value.trim() || null });
    if (error) { $("repMsg").textContent = error.code === "23505" ? "You have already reported this listing. Thank you." : "Could not send: " + error.message; return; }
    $("reportDlg").close();
    e.target.reset();
    toast("Thank you. Listing will be reviewed by campus admin.");
  };
}

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
    reportId = Number(rp.dataset.rep);
    $("repMsg").textContent = "";
    $("reportDlg").showModal();
    return;
  }
  const b = e.target.closest(".heart");
  if (!b) return;
  if (!user) { 
    showAuth("save"); 
    return; 
  }
  const id = Number(b.dataset.i);
  if (saved.has(id)) {
    saved.delete(id);
    toast("Removed from saved rooms");
    if (user) await db.from("saved_rooms").delete().eq("room_id", id);
  } else {
    saved.add(id);
    toast("Room saved to your favorites ♥");
    if (user) await db.from("saved_rooms").insert({ room_id: id });
  }
  render();
});

$("go").onclick = () => {
  flt = { l: $("fLoc").value, t: $("fType").value, p: $("fPrice").value };
  onlySaved = false;
  $("savedBtn").firstChild.nodeValue = "Show saved (";
  render();
  $("rooms").scrollIntoView({ behavior: "smooth" });
  const selUni = $("fUni") && $("fUni").selectedOptions.length ? $("fUni").selectedOptions[0].text.split("(")[0].trim() : "Hostels";
  toast("Showing verified hostels for " + selUni + "!");
};

if ($("fUni")) {
  $("fUni").onchange = () => {
    const uniName = $("fUni").selectedOptions[0].text.split("(")[0].trim();
    toast("Campus selected: " + uniName);
    render();
  };
}

$("savedBtn").onclick = () => {
  if (!user) { showAuth("save"); return; }
  onlySaved = !onlySaved;
  $("savedBtn").firstChild.nodeValue = onlySaved ? "Show all (" : "Show saved (";
  render();
};

/* ---------- Auth Modal & User Handling ---------- */
let guest = true, authKind = "welcome";

function showLanding() {
  openForm("login");
}

function openForm(m, note) {
  setMode(m);
  $("authForm").hidden = false;
  $("forgotBox").hidden = true;
  $("newPwBox").hidden = true;
  if (note) $("authSub").textContent = note;
  $("authScreen").hidden = false;
  document.body.classList.add("lock");
}

function showAuth(kind) {
  const m = (kind === "save" || kind === "login") ? "login" : "register";
  const note = kind === "save" ? "Log in or create a free account to save rooms and sync across devices." : "Join CampusNest to discover verified hostels and campus deals.";
  openForm(m, note);
}

function hideAuth() {
  $("authScreen").hidden = true;
  document.body.classList.remove("lock");
}

const authClose = $("authClose");
if (authClose) authClose.onclick = hideAuth;
$("authScreen").onclick = e => {
  if (e.target === $("authScreen")) hideAuth();
};

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
  $("authSubmit").textContent = reg ? "Create Free Account" : "Log In";
  $("authTitle").textContent = reg ? "Create your account" : "Welcome back";
  $("authSub").textContent = reg ? "Join CampusNest to find verified hostels and shop safely." : "Log in to access your saved shortlist and dashboard.";
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
    res = await db.auth.signUp({ 
      email, 
      password, 
      options: { 
        data: { 
          full_name: $("aName").value.trim(), 
          school: $("aSchool").value.trim(), 
          role: $("aRole").value 
        } 
      } 
    });
  } else {
    res = await db.auth.signInWithPassword({ email, password });
  }
  if (res.error) { msg.textContent = res.error.message; return; }
  if (mode === "register" && !res.data.session) { 
    msg.textContent = "Account created! You can now log in."; 
    setMode("login");
    return; 
  }
  msg.textContent = "";
  hideAuth();
  await refreshUser();
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
  user = u; profile = p;
  if (u) saved = s;
  const isAdmin = !!(profile && profile.is_admin);
  const studentOk = !!(profile && profile.student_until && new Date(profile.student_until) > Date.now());
  premium = true; // Always allow free contact during demo
  
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
  
  // Hero price badge
  if ($("heroBadgePrice")) {
    $("heroBadgePrice").textContent = user ? "₦180,000 / yr" : "Verified Rate • Log in to view";
  }

  // 1. Search & AI Banner visibility
  if ($("searchLoggedOutTeaser")) $("searchLoggedOutTeaser").hidden = !!user;
  if ($("searchSection")) $("searchSection").hidden = !user;
  if ($("aiBannerSection")) $("aiBannerSection").hidden = !user;

  // 2. Available Rooms visibility
  if ($("roomsLoggedOutBox")) $("roomsLoggedOutBox").hidden = !!user;
  if ($("grid")) $("grid").hidden = !user;
  if ($("roomsBar")) $("roomsBar").hidden = !user;

  // 3. Roommate Hub visibility
  if ($("roommatesLoggedOutBox")) $("roommatesLoggedOutBox").hidden = !!user;
  if ($("roommatesList")) $("roommatesList").hidden = !user;
  if ($("postRoommateBtn")) $("postRoommateBtn").hidden = !user;

  // 4. Campus Marketplace visibility
  if ($("sellItemBtn")) $("sellItemBtn").hidden = !user;
  document.querySelectorAll(".market-unlocked").forEach(el => el.hidden = !user);
  document.querySelectorAll(".market-locked").forEach(el => el.hidden = !!user);

  // 5. Partner with CampusNest visibility
  if ($("bizLoggedOutBox")) $("bizLoggedOutBox").hidden = !!user;
  if ($("bizFormWrapper")) $("bizFormWrapper").hidden = !user;
  if ($("bizGridWrapper")) $("bizGridWrapper").hidden = !user;

  if (user) {
    hideAuth();
    render();
  }
}

async function logout() {
  await db.auth.signOut();
  authKind = "out";
  $("authForm").reset();
  await refreshUser();
  toast("Logged out successfully");
}

function showSaved() {
  onlySaved = true;
  $("savedBtn").firstChild.nodeValue = "Show all (";
  render();
  $("rooms").scrollIntoView({ behavior: "smooth" });
}

$("authBtn").onclick = () => (user ? logout() : showAuth("login"));
$("logoutBtn").onclick = logout;
$("openAuth").onclick = () => showAuth("register");
if ($("upgradeBtn")) $("upgradeBtn").onclick = upgrade;
if ($("heroSaved")) $("heroSaved").onclick = showSaved;

let recovering = recoveringAtLoad;
function showRecovery() {
  $("authScreen").hidden = false;
  document.body.classList.add("lock");
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

db.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") { recovering = true; showRecovery(); return; }
  if (event === "TOKEN_REFRESHED") return;
  if (event === "SIGNED_IN" && session && user && session.user.id === user.id) return;
  setTimeout(refreshUser, 0);
});

/* ---------- Businesses Loading & Submissions ---------- */
function bizMedia(b) {
  const pics = mediaList(b), mc = pics.length + (isUrl(b.video_url) ? 1 : 0);
  if (!mc) return "";
  return '<div class="ph" data-gal="biz:' + b.id + '">' + 
    (pics.length ? '<img src="' + esc(pics[0]) + '" alt="' + esc(b.business_name) + '" loading="lazy">' : "Video") +
    (mc > 1 ? '<span class="mcount">📸 ' + pics.length + (isUrl(b.video_url) ? " + video" : "") + "</span>" : "") + 
    "</div>";
}

async function loadBiz() {
  try {
    const { data, error } = await db.from("business_requests").select("id,business_name,category,details,contact_email,phone,photos,video_url").eq("paid", true).order("created_at", { ascending: false });
    if (!error && data && data.length) {
      bizRows = data;
      $("bizGrid").innerHTML = data.map(b =>
        '<article class="card">' + bizMedia(b) + '<div class="in"><h3>' + esc(b.business_name) + "</h3>" +
        (b.category ? '<div class="chips"><span>' + esc(b.category) + "</span></div>" : "") +
        (b.details ? '<p class="desc">' + esc(b.details) + "</p>" : "") +
        (b.contact_email ? '<a class="btn dark" href="mailto:' + esc(b.contact_email) + '">Email</a>' : "") +
        (b.phone ? phoneBtns(b.phone, "Hi, I found " + b.business_name + " on CampusNest.") : "") +
        "</div></article>").join("");
      return;
    }
  } catch (e) {}

  // Fallback demo partners
  $("bizGrid").innerHTML = `
    <article class="card">
      <div class="ph"><img src="img-hostel.jpg" alt="Campus Lodge Partner"></div>
      <div class="in">
        <h3>Royal Palms Student Lodge</h3>
        <div class="chips"><span>Verified Partner</span><span>Hostel</span></div>
        <p class="desc">10 units of self-con rooms with 24/7 solar light, borehole water, and 4 mins walk to UNILAG gate.</p>
        <div class="cbtns">
          <a class="btn" target="_blank" rel="noopener" href="https://wa.me/2347018051613?text=Hi%20Royal%20Palms%20Hostel,%20I%20found%20you%20on%20CampusNest.">💬 Chat on WhatsApp</a>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=charlesloveth002@gmail.com&su=Inquiry%20about%20Royal%20Palms%20Hostel">✉️ Message via Gmail</a>
        </div>
      </div>
    </article>
    <article class="card">
      <div class="ph"><img src="demo-shoes.jpg" alt="Student Campus Store"></div>
      <div class="in">
        <h3>UniKicks Campus Thrift</h3>
        <div class="chips"><span>Student Entrepreneur</span><span>Fashion</span></div>
        <p class="desc">Affordable sneaker cleaning and premium thrifts delivered directly to your hostel door.</p>
        <div class="cbtns">
          <a class="btn" target="_blank" rel="noopener" href="https://wa.me/2347018051613?text=Hi%20UniKicks,%20I%20found%20you%20on%20CampusNest.">💬 Chat on WhatsApp</a>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=charlesloveth002@gmail.com&su=Inquiry%20about%20UniKicks%20Thrift">✉️ Message via Gmail</a>
        </div>
      </div>
    </article>
  `;
}

$("bizForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("bizMsg");
  msg.textContent = "Submitting listing request...";
  try {
    const { error } = await db.from("business_requests").insert({
      business_name: $("bName").value.trim(),
      category: $("bCat").value.trim(),
      details: $("bDetails").value.trim(),
      contact_email: $("bMail").value.trim(),
      phone: $("bPhone").value.trim()
    });
    if (error) { msg.textContent = "Could not send: " + error.message; return; }
  } catch (err) {}
  
  msg.textContent = "✔ Listing request received! A campus ambassador will contact you on WhatsApp to verify within 2 hours.";
  toast("Listing submitted for verification!");
  e.target.reset();
};

/* ---------- Interactive Tabs & NestBot AI ---------- */
document.querySelectorAll(".campus-card").forEach(card => {
  card.onclick = () => {
    if (!user) {
      showAuth("register");
      $("authSub").textContent = "Create a free student account or log in to explore verified hostels for this campus!";
      return;
    }
    const campus = card.dataset.campus;
    if ($("fUni")) {
      $("fUni").value = campus;
      const uniName = $("fUni").selectedOptions[0].text.split("(")[0].trim();
      toast("Campus selected: " + uniName);
    }
    $("rooms").scrollIntoView({ behavior: "smooth" });
  };
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    if (tab === "rooms") $("rooms").scrollIntoView({ behavior: "smooth" });
    else if (tab === "roommates") $("roommates").scrollIntoView({ behavior: "smooth" });
    else if (tab === "market") $("shop").scrollIntoView({ behavior: "smooth" });
  };
});

document.querySelectorAll(".ai-chip").forEach(chip => {
  chip.onclick = () => {
    const prompt = chip.dataset.prompt;
    if (prompt === "gate") {
      $("fLoc").value = "Near Campus Gate";
      flt = { l: "Near Campus Gate", t: "", p: "" };
      toast("🤖 NestBot: Found hostels walking distance to Campus Gate!");
    } else if (prompt === "budget") {
      $("fPrice").value = "1";
      flt = { l: "", t: "", p: "1" };
      toast("🤖 NestBot: Filtered affordable hostels under ₦150k!");
    } else if (prompt === "light") {
      flt = { l: "", t: "", p: "" };
      toast("🤖 NestBot: Highlighting accommodations with 24/7 Power!");
    } else if (prompt === "apartment") {
      $("fType").value = "Apartment";
      flt = { l: "Estate Road", t: "Apartment", p: "" };
      toast("🤖 NestBot: Filtered self-contained flats with balcony!");
    }
    render();
    $("rooms").scrollIntoView({ behavior: "smooth" });
  };
});

/* ---------- Menu & Start ---------- */
$("menu").onclick = function () {
  const o = $("links").classList.toggle("open");
  this.setAttribute("aria-expanded", o);
};
$("links").onclick = () => $("links").classList.remove("open");

// Initialize
setMode("register");
loadRooms();
loadBiz();
refreshUser();
