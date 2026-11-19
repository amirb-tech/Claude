# Landing page (built at `/welcome`)

Voice: plain, calm, exact. No reviewer quotes, no proof section until there
are real users who agreed to be quoted.

1. **Hero**
   - Headline: **Plays what you pick.**
   - Under it: Cueline is a music player that plays exactly the album or playlist you chose, in your order. No ads, no slipped-in songs, no skip limits.
   - Button: **Start listening** → `/` (no account needed to listen)
   - Image: a real screenshot of an album playing (`app/public/landing/player.png`)
2. **The problem** (paraphrased from the top two themes in `fixes.md`)
   - "You asked for your playlist. You got your playlist, plus songs someone else chose." (songs added, smart features)
   - "Shuffle keeps landing on the same few songs, and sometimes turns itself back on." (shuffle)
   - "And every few songs, an ad." (ads)
3. **How it works**
   1. Find an album, an artist or a song.
   2. Press play, or build a playlist from anything with Add to playlist.
   3. It plays exactly that. Change the queue whenever you like.
4. **What's different** (fixes first)
   - Your list, only your list: nothing is added, and autoplay is off unless you turn it on. *(fix #3)*
   - Fair shuffle: every song once before any repeats, and the queue shows the order. *(fix #2)*
   - No ads, no skip limits, every song on demand, on the free plan. *(fix #1)*
   - Turn things off: hide your listening history from Home. *(fix #4)*
   - A queue that stays put, even after you close the tab. *(fix #5)*
   - Music only. No podcasts, video or AI host. No review pop-ups. *(fixes #6, #7)*
   - Then the basics you'd expect: hearts, playlists, collection, keyboard shortcuts, phone-sized layout.
5. **Pricing**: Listener is free and complete. Supporter ("pay the artists you play") is opening soon, as a waitlist. See `pricing.md`.
6. **FAQ**
   - *Is it really free with no ads?* Yes. The free plan is the whole player. Money comes from supporters and from labels who host their music here.
   - *Can I bring my playlists from another app?* Not yet. There's no importer, so we won't pretend there is one.
   - *Whose music is on here?* Music published by the artists and labels who own it. The demo catalogue on this build was made by a script, to test the player.
   - *Is there an app?* The web player works on phones. Native apps come later.
   - *Can I delete my account?* Yes, in Settings, at once, with everything in it.
7. **Final call to action:** "Pick something. It'll play just that." → **Start listening**
