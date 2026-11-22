# M.TECH Website

Single-file static site: everything (HTML, CSS, JS) lives in `index.html`.

## Before it works
Open `index.html`, find the `firebaseConfig` object near the bottom (search for
"PASTE_YOUR_API_KEY"), and replace it with the config object from your own
Firebase project (Project Settings > Your apps > the web app `</>` icon).
Also enable Email/Password and Google under Authentication > Sign-in method
in the Firebase console.

## Deploy
1. Open this folder in IntelliJ.
2. Git > Create Git Repository, then Commit, then Share Project on GitHub.
3. On netlify.com: Add new site > Import an existing project > pick the repo.
   Leave the build command blank; publish directory is "." (this is already
   set in netlify.toml).
