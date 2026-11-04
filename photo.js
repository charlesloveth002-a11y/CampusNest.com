// Shrinks a photo in the browser, then uploads it to Supabase storage.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1200 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => (b ? resolve(b) : reject(new Error("Could not read the image"))), "image/jpeg", 0.75);
    };
    img.onerror = () => reject(new Error("That file is not a valid image"));
    img.src = URL.createObjectURL(file);
  });
}

async function uploadListingPhoto(file) {
  const { data: { session } } = await db.auth.getSession();
  const blob = await compressImage(file);
  const path = session.user.id + "/" + Date.now() + ".jpg";
  const up = await db.storage.from("listing-photos").upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw up.error;
  return db.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}

// Up to 5 photos at a time.
async function uploadPhotos(files) {
  const list = Array.from(files || []).slice(0, 5);
  const urls = [];
  for (const f of list) urls.push(await uploadListingPhoto(f));
  return urls;
}

// One short video (max 25 MB).
async function uploadListingVideo(file) {
  if (!file) return null;
  if (!/^video\//.test(file.type)) throw new Error("That file is not a video");
  if (file.size > 25 * 1024 * 1024) throw new Error("The video is bigger than 25 MB. Please use a shorter clip (about 30 seconds).");
  const { data: { session } } = await db.auth.getSession();
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = session.user.id + "/" + Date.now() + "." + ext;
  const up = await db.storage.from("listing-videos").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  return db.storage.from("listing-videos").getPublicUrl(path).data.publicUrl;
}
