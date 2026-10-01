# Native Popup

Native Popup is a RPG Maker MV plugin that shows native Windows popup dialogs
outside the game window.

Native Popup currently supports Windows only.

## Requirements

- RPG Maker MV
- Windows

## Usage

Call it from an event's Script command or from another plugin:

```js
nativePopup("Hello from RPG Maker MV.", "Hello!");
```

### `nativePopup(text, title, options)`

Opens a popup.

- `text` is the popup's message.
- `title` is the title bar. Defaults to `"Notice"` if left blank.
- `options` is for customizing the popup (see [Options](#options) below).

Returns `true` if it successfully opens a popup, returns `false` if not. The popup also opens asynchronously, meaning the game is still active even if the popup is open.

### `nativePopupClose(name)`

Closes every open popup that was given this `name`. Returns how many it closed. If the parameter is left blank, it'll try to close all open popups instead and return how many it closed

## Options

| Option     | Type              | Default              | Description                                                                             |
| ---------- | ----------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `icon`     | string            | `"none"`             | Icon to show: `"none"`, `"info"`, `"warning"`, `"error"`, or `"question"`.              |
| `front`    | boolean           | `false`              | Brings the popup to the very top on open of the popup.                                  |
| `timeout`  | number            | `0`                  | Seconds before the popup closes on its own. `0` means no timeout.                       |
| `logo`     | boolean           | `false`              | Shows the game's logo in the popup's title bar.                                         |
| `buttons`  | array or `"none"` | a single `OK` button | Custom button labels, up to 8. Use `"none"` for a popup with no buttons.                |
| `onResult` | function          | none                 | Called once the popup closes (see [More Examples](#more-examples)).                     |
| `variable` | number            | none                 | Game variable ID that receives the result index (see [More Examples](#more-examples)).  |
| `x`        | number            | none                 | Horizontal screen position, in pixels. Must be given together with `y`.                 |
| `y`        | number            | none                 | Vertical screen position, in pixels. Must be given together with `x`.                   |
| `close`    | string            | `"normal"`           | `"normal"`, `"disabled"`, or `"hidden"` (see [More Examples](#more-examples)).          |
| `name`     | string            | none                 | Lets `nativePopupClose(name)` close this popup later. Multiple popups can share a name. |

## More Examples

### Buttons and results

For using the function in RPGMaker, use `variable` and check it afterward with a Conditional Branch:

```js
nativePopup("Pick one", "Notice", {
  buttons: ["What", "Who", "Why"],
  variable: 12,
});
```

For using the function outside RPGMaker or testing this in DevTools, use `onResult`:

```js
nativePopup("Wanna know something? ", "Question", {
  icon: "question",
  buttons: ["Yes", "No"],
  onResult: function (index, label) {
    if (index === 0) {
      // Yes was picked
    } else if (index === 1) {
      // No was picked
    }
  },
});
```

Notes:

- `label` is the clicked button's text, or `null` if no button was picked.
- `variable`/`index` can get `0` to `8` if a button is picked, and stays `-1` if it was closed without a choice.

### Positioning

```js
nativePopup("Over here!", "Hey!", { x: 120, y: 80 });
```

`x` and `y` are pixels from the top-left of the whole screen (on what monitor was the game opened). If the popup would land off-screen, it's moved back for the whole popup to be seen. Both `x` and `y` must be given for the popup to be positioned.

### Close modes and named popups

```js
nativePopup("Are you ready?", "Warning", {
  close: "hidden",
  buttons: ["OK"],
  name: "warning",
});
```

- `"normal"` — the X, Esc, and Alt+F4 all close the popup as usual.
- `"disabled"` — the X is visible but does nothing, and Esc/Alt+F4 doesn't work.
- `"hidden"` — there's no X at all, Esc/Alt+F4 is also pointless.

With `"disabled"` or `"hidden"`, if you plan on setting the popup with no way for the player to close, you can close the popup via the `nativePopupClose()`, for example:

```js
nativePopup("YOU WILL NOT LEAVE.", "CANNOT", {
  buttons: "none",
  close: "hidden",
  name: "stuck",
});

// later, from anywhere:
nativePopupClose("stuck");
```

## Questions? Issues?

You can request an Issue on this repository, or you can ask a question to me thru [Discord](https://discord.com/users/1252428589849251864).
