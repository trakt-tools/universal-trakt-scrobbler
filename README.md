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
	<a href="https://crowdin.com/project/universal-trakt-scrobbler" title="Crowdin" target="_blank">
		<img src="https://badges.crowdin.net/universal-trakt-scrobbler/localized.svg">
	</a>
</p>
<p align="center">
  <a href="https://chrome.google.com/webstore/detail/universal-trakt-scrobbler/mbhadeogepkjdjeikcckdkjdjhhkhlid"><img src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/chrome-badge.png" alt="Get the extension on Chrome"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/universal-trakt-scrobbler"><img src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/firefox-badge.png" alt="Get the extension on Firefox"></a>
</p>

You can also install the extension manually by downloading the zip for your browser here: https://github.com/trakt-tools/universal-trakt-scrobbler/releases

### Loading the extension manually in Chrome

1. Unzip `chrome.zip`
2. Go to chrome://extensions
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the folder you unzipped

### Loading the extension manually in Firefox

1. Go to about:debugging#/runtime/this-firefox
2. Click "Load temporary addon"
3. Select `firefox.zip` or, if it's unzipped, select any file in the folder

Extension will be enabled until you restart Firefox.

### Table of Contents

- [Loading the extension manually in Chrome](#loading-the-extension-manually-in-chrome)
- [Loading the extension manually in Firefox](#loading-the-extension-manually-in-firefox)
- [Table of Contents](#table-of-contents)
- [What is Universal Trakt Scrobbler?](#what-is-universal-trakt-scrobbler)
- [Why do I need this extension?](#why-do-i-need-this-extension)
- [Which streaming services are supported?](#which-streaming-services-are-supported)
- [How does the extension work?](#how-does-the-extension-work)
- [Known Issues](#known-issues)
- [Other Problems](#other-problems)
- [Help Translate](#help-translate)
- [Development](#development)
  - [How to add more streaming services](#how-to-add-more-streaming-services)
  - [How to add scrobbler/sync to streaming services](#how-to-add-scrobblersync-to-streaming-services)
- [Credits](#credits)

### What is Universal Trakt Scrobbler?

An extension that allows you to automatically scrobble TV shows and movies that you are watching, and sync your history, from your favorite streaming services to Trakt.tv.

### Why do I need this extension?

If you want to scrobble / sync from Netflix, this is the only Trakt.tv [plugin](https://trakt.tv/apps) that does it. In the future, we'll be adding support for more streaming services, so it will also serve as a single extension that works for multiple services.

### Which streaming services are supported?

<!-- services-start -->
<!-- Update this section with `npx trakt-tools dev update-readme` -->

| Streaming Service | Scrobble | Sync | Limitations                     |
| :---------------: | :------: | :--: | :------------------------------ |
|   Amazon Prime    |    ✔️    |  ✔️  | -                               |
|       AMC+        |    ✔️    |  ❌  | -                               |
|       Crave       |    ✔️    |  ✔️  | -                               |
|    Crunchyroll    |    ❌    |  ✔️  | Can't identify movies as movies |
|      Disney+      |    ✔️    |  ❌  | -                               |
|        Go3        |    ✔️    |  ❌  | -                               |
|     GoPlay BE     |    ✔️    |  ❌  | -                               |
|      HBO Go       |    ✔️    |  ❌  | -                               |
|      HBO Max      |    ✔️    |  ✔️  | -                               |
|      Hotstar      |    ✔️    |  ❌  | -                               |
|      Kijk.nl      |    ✔️    |  ❌  | -                               |
|       MUBI        |    ✔️    |  ✔️  | -                               |
|      Netflix      |    ✔️    |  ✔️  | -                               |
|        NRK        |    ✔️    |  ✔️  | -                               |
|     Player.pl     |    ✔️    |  ❌  | -                               |
|  Polsatboxgo.pl   |    ✔️    |  ❌  | -                               |
|    SkyShowtime    |    ✔️    |  ❌  | -                               |
|       Star+       |    ✔️    |  ❌  | -                               |
|    Streamz BE     |    ✔️    |  ❌  | -                               |
|      Tet TV+      |    ✔️    |  ❌  | -                               |
|     TV 2 PLAY     |    ✔️    |  ❌  | -                               |
|      Viaplay      |    ✔️    |  ✔️  | -                               |
|       Vidio       |    ✔️    |  ❌  | -                               |
|     VRTNu BE      |    ✔️    |  ❌  | -                               |
|     VTMGo BE      |    ✔️    |  ❌  | -                               |
|    Wakanim.tv     |    ✔️    |  ❌  | -                               |

<!-- services-end -->

### How does the extension work?

It extracts information about the TV shows / movies that you are watching / have watched by scraping the page or using the stremaing service API and sends the data to Trakt using the [Trakt API](https://trakt.docs.apiary.io/).

### Known Issues

- You might have to disable the "automatic mode" in the Temporary Containers extension while logging in, if you use it.
- Make sure you are logged into streaming services before trying to sync history content.

### Other Problems

If you find any other problems or have suggestions or questions, feel free to [open an issue](https://github.com/trakt-tools/universal-trakt-scrobbler/issues/new).

### Help Translate

Help us translate the extension through Crowdin at https://crowdin.com/project/universal-trakt-scrobbler. You'll need to create a Crowdin account (you can sign in with your GitHub account). Then select the language you wish to contribute to and start translating (don't forget to save your translations). If a language isn't available yet, open an issue [here](https://github.com/trakt-tools/universal-trakt-scrobbler/issues/new?assignees=trakt-tools-bot&labels=new+language&template=new-language.md&title=Add+new+language%3A+%5BLANGUAGE%5D).

You can also vote for translations, which helps confirm good translations and flag inaccurate ones.

If you want to get credit on GitHub for the translations, make sure your Crowdin username is the same as the GitHub one, or similar, so we know it's you. Once the PR is merged, you'll appear as one of the contributors in the commit. Example:

![Screenshot 2022-03-11 100844](https://user-images.githubusercontent.com/25509361/157872624-e5f70050-8e29-4f21-b0b6-0e2e274c3ce2.png)

**For reviewers:**

Never delete the `translations` branch after merging PRs from Crowdin, as Crowdin uses it to sync changes. When merging PRs, make sure to change the generic "New Crowdin updates" title to a more specific title detailing exactly which languages were updated.

### Development

1. Create an application in the [Trakt API](https://trakt.tv/oauth/applications/new) (don't forget to check the `/scrobble` permission).
2. In `Redirect uri:`, put `https://trakt.tv/apps`.
3. In `Javascript (cors) origins:`, put `moz-extension://` and `chrome-extension://`.
4. Copy the `.env.example` example file and change the Trakt.tv credentials. Make sure to also set the extension ID to an arbitrary but unique string, otherwise some browser features might not be available to the extension.

```bash
cp .env.example .env
```

5. Use [nvm](https://github.com/creationix/nvm) to run the correct version of Node.js.

```bash
nvm use
```

6. Install the dependencies.

```bash
pnpm install
```

- To run in development mode:

```bash
pnpm start
```

- To get the build version for development mode (does not watch files):

```bash
pnpm run build-dev
```

- To get the build version for production mode (generates app.zip, ready for deployment):

```bash
pnpm run build
pnpm run zip
```

#### How to add more streaming services

- Run `npx trakt-tools dev create-service`. It will prompt you a few questions about the service and automatically generate all the necessary files. If you want to provide all the information at once without being prompted, run `npx trakt-tools dev create-service --help` to see the options.
- Go to the generated files and adjust them accordingly. You can see the files of the other services for some reference.

#### How to add scrobbler/sync to streaming services

- If a service is missing either the scrobbler or the sync function, you can run `npx trakt-tools dev update-service` to automatically generate all the missing files.

### Credits

This extension is based on [traktflix](https://github.com/tegon/traktflix), the original Netflix sync developed by [tegon](https://github.com/user/tegon), which was discontinued in favor of Universal Trakt Sync.

<h3 align="center">
  <img alt="TMDb API" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/tmdb-api-logo.png" width="150">
  <img alt="Trakt API" src="https://github.com/trakt-tools/universal-trakt-scrobbler/raw/master/assets/trakt-api-logo.png" width="150">
</h3>

This product uses the TMDb API, but is not endorsed or certified by TMDb.

This product uses the Trakt.tv API.

[LICENSE](LICENSE)
