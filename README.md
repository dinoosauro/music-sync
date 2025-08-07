# music-sync

Create a .LRC file by manually syncronizing the audio with the text

Try it: https://dinoosauro.github.io/music-sync/

## Usage

### Choose a file

When you open the page, you'll be prompted to choose a file. You can also choose to
read its metadata by using the music-metadata library, so that you'll be able to sync the embedded lyrics of an audio file.

### Lyrics settings

After you've chosen a file, you'll be prompted to add the authors that have sang it. This step is optional, but it'll permit you to customize the output lyrics. If you want to remove an author you've already added, click on its name below.

Then, you can choose if you want to sync these lyrics word-by-word. If disabled, the standard line-by-line sync will be used. Then, you'll finally find the buttons that'll permit you to:
- Import the lyrics from a file
  * LRC and TTML files are supported: the webpage will try to read most of the metadata contained in them (word-by-word lyrics, authors, background voices, groups etc.)
  * You can also read a generic text file or import the text from your clipboard
- Use the embedded lyrics metadata in your audio file;
- Start with an empty textbox, and write manually the lyrics.

You can also download the album art and the fetched metadata if you want so.

![The UI of the second step](./readme/Screenshot%202025-08-07%20at%2011-14-01%20MusicSync.png)

### Sync the lyrics

After you've imported the lyrics, you'll see the lyrics syncing UI. At the top you can find the audio controls, and you can slow down or speed up its playback. At the bottom, you'll find a table, that'll contain:
- A textbox with the start of the word/verse (in seconds);
    * At the left of this textbox, you'll find either a gear or a zoom lens icon
        - If you see a gear icon, you can change the verse settings: you can set this verse as the beginning of a new stanza by specifying its type (ex: `Chrous` etc.); you can make this verse as the start/end of a selection to edit the authors of all these verses; and you can set this verse as a background voice.
        - If you see a zoom out icon, you can set that specific word as a background voice.
- A textbox with the content of the verse/word;
    * You can edit the content as you like, and, if you want to create a new verse, just press `Enter` on your keyboard.
- If you've added the authors, a dropdown menu that, when clicked, will permit you to pick who is singing that verse/word.


Before the table, you'll find three buttons: 
- The first will mark the current second as the end of the line;
- The second will mark the current second as the start of the current line;
- The third one will permit you to export everything.
    * You can export in various formats, including, but not limiting to LRC, TTML and JSON (the Object that music-sync uses to store the music verses/words). If you're exporting a LRC or TTML file, you'll be able to choose some options.

Below you can find some screenshot of these sync UI.

#### Verse-by-verse syncing

![Verse-by-verse syncing](./readme/Screenshot%202025-08-07%20at%2011-28-17%20MusicSync.png)

#### Word-by-word syncing

![Word-by-word syncing](./readme/Screenshot%202025-08-07%20at%2011-30-24%20MusicSync.png)

#### Verse options

![Verse options](./readme/Screenshot%202025-08-07%20at%2011-28-29%20MusicSync.png)

#### LRC export settings

![LRC export settings](./readme/Screenshot%202025-08-07%20at%2011-32-31%20MusicSync.png)

#### TTML export settings

![TTML export settings](./readme/Screenshot%202025-08-07%20at%2011-32-48%20MusicSync.png)

## Why this tool

I thought it could be useful as a way to learn more about using Dates. I
sometimes buy CDs of my favorite albums, and the sound quality is
certainly better than Spotify (let's hope Hi-Fi will come soon). However, having
synced lyrics is a really great feature, and this might be a way to replicate
it.

_I'm too lazy to sync all the lyrics of an album, so I won't actually do it
– but at least it was a cool project to make._
