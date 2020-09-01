<h1 align="center">
  <br>
  <img alt="Universal Trakt Scrobbler" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/src/images/uts-icon-128.png" width="150">
  <br>
  Universal Trakt Scrobbler
  <br>
</h1>
<h4 align="center">A universal scrobbler for Trakt.tv.</h4>
<p align="center">
  <a href="https://github.com/trakt-tools/universal-trakt-scrobbler/releases">
    <img alt="GitHub Release" src="https://img.shields.io/github/release/trakt-tools/universal-trakt-scrobbler.svg">
  </a>
</p>
<p align=left">
  <a href="">
    <img alt="Get the extension on Chrome" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/chrome-badge.png">
  </a>
</p>
<p align=left">
  <a href="">
    <img alt="Get the extension on Firefox" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/firefox-badge.png"></a>
</p>

### Table of Contents

- [What is Universal Trakt Scrobbler?](#what-is-universal-trakt-scrobbler)
- [Why do I need this extension?](#why-do-i-need-this-extension)
- [Which streaming services are supported?](#which-streaming-services-are-supported)
- [How does the extension work?](#how-does-the-extension-work)
- [Problems](#problems)
- [Development](#development)
- [Credits](#credits)

### What is Universal Trakt Scrobbler?

An extension that allows you to automatically scrobble TV shows and movies that you are watching, and sync your history, from your favorite streaming services to Trakt.tv.

### Why do I need this extension?

If you want to scrobble / sync from Netflix, this is the only Trakt.tv [plugin](https://trakt.tv/apps) that does it. In the future, we'll be adding support for more streaming services, so it will also serve as a single extension that works for multiple services.

### Which streaming services are supported?

- Amazon Prime (Scrobble only)
- HBO Go (Scrobble only - tested only for Latin America)
- Netflix
- NRK (Sync only)
- Viaplay (Sync only)

### How does the extension work?

It extracts information about the TV shows / movies that you are watching / have watched by scraping the page or using the stremaing service API and sends the data to Trakt using the [Trakt API](https://trakt.docs.apiary.io/).

### Known Issues

- You might have to disable the "automatic mode" in the Temporary Containers extension while logging in, if you use it.
- Make sure you are logged into streaming services before trying to sync history content.

### Other Problems

If you find any other problems or have suggestions or questions, feel free to [open an issue](https://github.com/trakt-tools/universal-trakt-scrobbler/issues/new).

### Development

1. Create an application in the [Trakt API](https://trakt.tv/oauth/applications/new) (don't forget to check the `/scrobble` permission).
2. In `Redirect uri:`, put `https://trakt.tv/apps`.
3. In `Javascript (cors) origins:`, put `moz-extension://` and `chrome-extension://`.
4. Copy the `config.dev.json` example file and change the Trakt.tv credentials.

```bash
cp config.dev.json config.json
```

5. Use [nvm](https://github.com/creationix/nvm) to run the correct version of Node.js.

```bash
nvm use
```

6. Install the dependencies.

```bash
npm install
```

- To run in development mode:

```bash
npm start
```

- To get the build version for development mode (does not watch files):

```bash
npm run build-dev
```

- To get the build version for production mode (generates app.zip, ready for deployment):

```bash
npm run build
npm run zip
```

#### How to add more streaming services

- First of all, edit the file `src/streaming-services/streaming-services.ts` and add an entry for the new service with a unique ID e.g. 'Netflix' => 'netflix', 'Amazon Prime' => 'amazon-prime'. Don't forget to set the `hasScrobbler` and `hasSync` flags correctly.
- Some services can have different aspects and limitations, and updates may be needed elsewhere in the source code to handle these cases, so the steps below are more of a guideline.
- For a scrobbler: copy the `src/streaming-services/scrobbler-template/` folder and adjust accordingly. Remember to use **the same ID** specified in `src/streaming-services/streaming-services.ts` for the folder name and for the content script file name. That's it!
- For a sync: copy the `src/streaming-services/sync-template/` folder and adjust accordingly. Remember to use **the same ID** specified in `src/streaming-services/streaming-services.ts` for the folder name, and don't forget to import the `*Api.ts` file in `src/streaming-services/pages.ts`, otherwise the service won't load at all. That's it!
- You can see the folders of the other services for some reference. The templates are just the basic to get you started.

### Credits

This extension is based on [traktflix](https://github.com/tegon/traktflix), the original Netflix sync developed by [tegon](https://github.com/user/tegon), which was discontinued in favor of Universal Trakt Sync.

<h3 align="center">
  <img alt="TMDb API" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/tmdb-api-logo.png" width="150">
  <img alt="Trakt API" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/trakt-api-logo.png" width="150">
</h3>

This product uses the TMDb API, but is not endorsed or certified by TMDb.

This product uses the Trakt.tv API.

[LICENSE](LICENSE)
