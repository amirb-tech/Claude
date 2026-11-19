// Loads media/catalog.json (written by scripts/make_media.py) into the database.
// Idempotent: re-running replaces the catalogue but keeps users and their data
// for any track ids that still exist.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { db, now, run, tx, ROOT } from "./db.ts";

type Catalog = {
  artists: {
    id: string; name: string; genre: string; bio: string; image: string;
    albums: { id: string; title: string; type: string; release_date: string; cover: string;
      tracks: { id: string; title: string; track_number: number; duration_ms: number; audio: string }[] }[];
  }[];
};

const file = path.join(ROOT, "media", "catalog.json");
if (!existsSync(file)) {
  console.error("media/catalog.json not found. Run: npm run media");
  process.exit(1);
}
const cat: Catalog = JSON.parse(readFileSync(file, "utf8"));
const t0 = now();
let n = 0;
tx(() => {
  for (const a of cat.artists) {
    run(`INSERT INTO artists (id,name,bio,image_url,genre,created_at) VALUES (?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, bio=excluded.bio, image_url=excluded.image_url, genre=excluded.genre`,
      a.id, a.name, a.bio, a.image, a.genre, t0);
    for (const al of a.albums) {
      run(`INSERT INTO albums (id,artist_id,title,cover_url,release_date,type,created_at) VALUES (?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET title=excluded.title, cover_url=excluded.cover_url, release_date=excluded.release_date, type=excluded.type`,
        al.id, a.id, al.title, al.cover, al.release_date, al.type, t0);
      for (const t of al.tracks) {
        // a little fake popularity so "popular" shelves have an order on day one
        const plays = Math.floor(((t.id.charCodeAt(t.id.length - 1) * 7919 + t.duration_ms) % 9000) + 100);
        run(`INSERT INTO tracks (id,album_id,artist_id,title,track_number,duration_ms,audio_url,play_count,created_at)
             VALUES (?,?,?,?,?,?,?,?,?)
             ON CONFLICT(id) DO UPDATE SET title=excluded.title, duration_ms=excluded.duration_ms, audio_url=excluded.audio_url`,
          t.id, al.id, a.id, t.title, t.track_number, t.duration_ms, t.audio, plays, t0);
        n++;
      }
    }
  }
});
console.log(`seeded ${cat.artists.length} artists, ${n} tracks`);
db.close();
