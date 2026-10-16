# Amoriva — Language & Culture Exchange

A free, ad-supported web app where real members chat to practise languages. No fees, no paid chatting, no fake members.

## Files

| File | Module |
|---|---|
| `common.css` | All shared styles (light/dark theme) |
| `common.js` | Firebase init, auth guard, presence, helpers, bottom nav, ads, chip pickers |
| `index.html` | Onboarding (3 slides) |
| `auth.html` | Sign up / Log in / Forgot password |
| `setup.html` | Profile setup & edit (country, languages, interests, bio) |
| `members.html` | Member directory with real online status and language matching |
| `chats.html` | Conversation list with unread counts |
| `chat.html` | Real-time 1-to-1 chat, block & report |
| `profile.html` | Profile, theme, logout, delete account |
| `terms.html` | Terms, community rules, privacy (public — use as Play Console deletion/privacy URL) |
| `database.rules.json` | Security rules for the `amoriva` node |

## Setup

1. **Firebase config** — In Firebase Console → Project settings → Your apps, add a *Web app* to the `aviabustout` project if there isn't one. Copy `apiKey` and `appId` into `FIREBASE_CONFIG` at the top of `common.js`.
2. **Auth** — Authentication → Sign-in method → enable **Email/Password**. Under Authentication → Settings → Authorized domains, add your Vercel domain.
3. **Rules** — The database is shared with CowCash and PaidTasks, so don't replace your existing rules. Copy the `"amoriva": { ... }` block from `database.rules.json` and paste it inside your existing `"rules": { }` alongside the other apps' nodes. All Amoriva data is stored under `/amoriva`.
4. **Ads** — Once AdSense approves the domain, set `ADS.client` and `ADS.slot` in `common.js`. Until then ad slots stay hidden. If you wrap this in a B4A WebView, show AdMob natively instead (AdSense isn't allowed inside app WebViews).
5. **Deploy** — Push the folder to GitHub and import it in Vercel as a static site (no build step).
6. **Terms** — Replace `support@example.com` in `terms.html` with your real contact email.

## Data model (`/amoriva`)

```
users/{uid}        name, country, speaks[], learning[], interests[], bio, createdAt, lastSeen, profileComplete
status/{uid}       state ("online" | "offline"), at
messages/{chatId}/{msgId}   from, text, at        chatId = two uids sorted, joined by "_"
userChats/{uid}/{chatId}    with, last, lastFrom, at, unread
blocks/{uid}/{otherUid}     true
reports/{id}       by, against, chatId, reason, note, at   (write-only; read them in the Firebase console)
```

## Moderation

Check `/amoriva/reports` regularly in the Firebase console. To remove an abusive account, disable the user in Authentication and delete their `/amoriva/users/{uid}` node.

## Scaling note

`members.html` loads the 300 most recently active members and listens to the whole `status` node. That's fine for the first few thousand users; past that, move member search to a small backend (e.g. Flask on Render) or paginate.
