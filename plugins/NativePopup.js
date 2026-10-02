/*:
 * @target MV
 * @plugindesc Displays native Windows popup dialogs.
 * @author Anonymously599
 *
 * @help NativePopup.js
 *
 * Native Windows popup dialogs for RPG Maker MV and NW.js.
 *
 * Sample script calls:
 *   nativePopup("Message", "Title");
 *   nativePopup("Message", "Title", { icon: "error" });
 *   nativePopupClose("name");
 *   nativePopupClose();
 *
 * @param icon
 * @text Default Icon
 * @desc The icon at the popup
 * @type select
 * @option None
 * @value none
 * @option Information
 * @value info
 * @option Warning
 * @value warning
 * @option Error
 * @value error
 * @option Question
 * @value question
 * @default none
 *
 * @param front
 * @text Always On Top
 * @desc Show at the front. (Sadly from testing, only telling it to go at the front of all the apps don't work, so we force it)
 * @type boolean
 * @default false
 *
 * @param timeout
 * @text Default Timeout
 * @desc Time for all popups to finish.
 * @type number
 * @min 0
 * @default 0
 *
 * @param logo
 * @text Show Game Logo
 * @desc Displays the game's icon in the popup title bar
 * @type boolean
 * @default false
 *
 * @param close
 * @text Default Close Button
 * @desc Do you want the player to close the game? And if no, how so? By still showing it but not clickable, or completely removed?
 * @type select
 * @option Normal
 * @value normal
 * @option Disabled
 * @value disabled
 * @option Hidden
 * @value hidden
 * @default normal
 *
 */
(function () {
  "use strict";

  const fs = require("fs");
  const path = require("path");

  const PLUGIN_NAME = "nativepopup";
  const ARCH = process.arch;
  const NODE = "popup_" + ARCH + ".node";

  const ICONS = {
    none: 0,
    error: 0x10,
    question: 0x20,
    warning: 0x30,
    info: 0x40,
  };

  const MAX_BUTTONS = 8;

  const CLOSE_MODES = { normal: 0, disabled: 1, hidden: 2 };

  const ZIP_MESSAGE =
    "One of your mods is installed as a .zip file, so the plugins of this mod " +
    "cannot be loaded and may not work as expected. Unzip any zips so this " +
    "can see the files in its folder, delete/keep the .zip in a safe place, then restart the game.";

  let installedAsZip = false;
  try {
    for (const entry of window.$modLoader.knownMods.values()) {
      const plugins = Array.isArray(entry && entry.plugins)
        ? entry.plugins
        : [];
      const isThisPlugin = plugins.some(function (file) {
        const name = String(file)
          .match(/[^\/\\]*$/)[0]
          .toLowerCase()
          .replace(/\.[^.]*$/, "");
        return name === PLUGIN_NAME;
      });
      if (isThisPlugin) {
        installedAsZip = entry.type === "zip";
        break;
      }
    }
  } catch (e) {}

  if (installedAsZip) {
    console.error(ZIP_MESSAGE);
    try {
      window.alert(ZIP_MESSAGE);
    } catch (e) {}
  }

  let plugin = null;
  let searchedDirs = [];

  if (process.platform === "win32") {
    const sources = [];
    try {
      const page = decodeURIComponent(window.location.pathname);
      sources.push(path.dirname(page.replace(/^\/(?=[A-Za-z]:)/, "")));
    } catch (e) {}

    let args = process.argv;
    if (typeof nw !== "undefined" && nw.App) {
      args = args.concat(
        nw.App.fullArgv || [],
        nw.App.argv || [],
        nw.App.startPath,
      );
    }
    for (const raw of args) {
      const arg = String(raw)
        .trim()
        .replace(/^"(.*)"$/, "$1");
      if (arg[0] !== "-" && /[\\\/:]/.test(arg)) {
        sources.push(arg, path.dirname(arg));
      }
    }
    sources.push(path.dirname(process.execPath), process.cwd());

    const roots = Array.from(
      new Set(
        sources.map(function (s) {
          return path.resolve(s);
        }),
      ),
    ).filter(function (p) {
      try {
        return fs.statSync(p).isDirectory();
      } catch (e) {
        return false;
      }
    });

    const dirs = new Set();
    for (const root of roots) {
      dirs.add(path.join(root, "js", "libs"));
      dirs.add(path.join(root, "www", "js", "libs"));
    }
    for (const root of roots) {
      for (const rel of ["mods", path.join("www", "mods")]) {
        const modsDir = path.join(root, rel);
        let names = [];
        try {
          names = fs.readdirSync(modsDir).sort();
        } catch (e) {}
        for (const name of names) dirs.add(path.join(modsDir, name, "libs"));
      }
    }
    searchedDirs = Array.from(dirs);

    for (let d = 0; d < searchedDirs.length; d++) {
      const file = path.join(searchedDirs[d], NODE);
      if (!fs.existsSync(file)) continue;
      try {
        const node = require(file);
        if (node && typeof node.showMessage === "function") {
          plugin = node;
          break;
        }
      } catch (e) {
        const msg = (e && e.message) || "";
        console.warn("[Native Popup] could not load " + file + ": " + msg);
      }
    }
  }

  let params = null;
  try {
    const entry = window.$plugins.find(function (p) {
      return p && String(p.name).toLowerCase() === PLUGIN_NAME;
    });
    params = entry
      ? entry.parameters
      : window.PluginManager.parameters(PLUGIN_NAME);
  } catch (e) {}
  params = params || {};

  const truthy = /^(true|1|yes|on)$/i;
  const defaultIcon = String(params.icon).trim().toLowerCase();
  const defaultClose = String(params.close).trim().toLowerCase();
  const defaultTimeout = parseInt(params.timeout, 10);
  const DEFAULTS = {
    icon: Object.prototype.hasOwnProperty.call(ICONS, defaultIcon)
      ? defaultIcon
      : "none",
    front: truthy.test(String(params.front).trim()),
    timeout:
      isFinite(defaultTimeout) && defaultTimeout >= 0 ? defaultTimeout : 0,
    logo: truthy.test(String(params.logo).trim()),
    close: Object.prototype.hasOwnProperty.call(CLOSE_MODES, defaultClose)
      ? defaultClose
      : "normal",
  };

  let namedBoxes = Object.create(null);

  window.nativePopupClose = function (name) {
    if (!plugin) return 0;
    try {
      if (name === undefined || name === null) {
        namedBoxes = Object.create(null);
        return plugin.closeAll();
      }
      const key = String(name);
      const ids = namedBoxes[key] || [];
      let closed = 0;
      for (let i = 0; i < ids.length; i++) {
        if (plugin.closeMessage(ids[i])) closed++;
      }
      delete namedBoxes[key];
      return closed;
    } catch (e) {
      console.error(
        "[Native Popup] nativePopupClose failed: " + (e && e.message),
      );
      return 0;
    }
  };

  window.nativePopup = function (text, title, options) {
    if (!plugin) {
      console.error(
        (installedAsZip ? ZIP_MESSAGE + "\n" : "") +
          "[Native Popup] could not find or load " +
          NODE +
          " (the game's arch is " +
          ARCH +
          "). Looked in:\n  " +
          (searchedDirs.length ? searchedDirs.join("\n  ") : "(nowhere)"),
      );
      return false;
    }

    const popupOptions = Object.assign({}, DEFAULTS);
    for (const key of Object.keys(options || {})) {
      if (options[key] !== undefined) popupOptions[key] = options[key];
    }

    let buttons = [];
    if (Array.isArray(popupOptions.buttons)) {
      buttons = popupOptions.buttons
        .map(function (label) {
          return String(
            label === undefined || label === null ? "" : label,
          ).trim();
        })
        .filter(Boolean);
      if (buttons.length > MAX_BUTTONS) {
        console.warn(
          "[Native Popup] at most " +
            MAX_BUTTONS +
            " buttons are supported, the rest were ignored.",
        );
        buttons = buttons.slice(0, MAX_BUTTONS);
      }
    }
    const noButtons =
      popupOptions.buttons === "none" || popupOptions.buttons === false;

    let posX;
    let posY;
    const hasX = popupOptions.x !== undefined && popupOptions.x !== null;
    const hasY = popupOptions.y !== undefined && popupOptions.y !== null;
    if (hasX || hasY) {
      const x = Number(popupOptions.x);
      const y = Number(popupOptions.y);
      if (hasX && hasY && isFinite(x) && isFinite(y)) {
        posX = Math.round(x);
        posY = Math.round(y);
      } else {
        console.warn(
          "[Native Popup] x and y must both be numbers, so the given position was ignored.",
        );
      }
    }

    let closeMode = CLOSE_MODES.normal;
    if (popupOptions.close !== undefined && popupOptions.close !== null) {
      const closeKey = String(popupOptions.close).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(CLOSE_MODES, closeKey)) {
        closeMode = CLOSE_MODES[closeKey];
      } else {
        console.warn(
          '[Native Popup] close must be "normal", "disabled" or "hidden", so the given parameter was ignored.',
        );
      }
    }

    if (closeMode !== CLOSE_MODES.normal && buttons.length === 0 && !noButtons)
      buttons = ["OK"];

    const icon = Object.prototype.hasOwnProperty.call(ICONS, popupOptions.icon)
      ? ICONS[popupOptions.icon]
      : ICONS.none;
    const flags = icon | (popupOptions.front === true ? 0x40000 | 0x10000 : 0);

    const variable =
      typeof popupOptions.variable === "number" && popupOptions.variable > 0
        ? popupOptions.variable
        : 0;
    const wantResult =
      typeof popupOptions.onResult === "function" || variable > 0;

    try {
      const id = plugin.showMessage(
        String(text),
        String(title || "Notice"),
        flags,
        Math.max(0, popupOptions.timeout | 0),
        popupOptions.logo === true,
        buttons,
        wantResult,
        posX,
        posY,
        closeMode,
        noButtons,
      );
      if (
        typeof id === "number" &&
        typeof popupOptions.name === "string" &&
        popupOptions.name
      ) {
        const ids = namedBoxes[popupOptions.name] || [];
        ids.push(id);
        if (ids.length > 100) ids.shift();
        namedBoxes[popupOptions.name] = ids;
      }
      if (wantResult) {
        if (variable && window.$gameVariables)
          window.$gameVariables.setValue(variable, -1);
        const timer = setInterval(function () {
          let index;
          try {
            index = plugin.pollResult(id);
          } catch (e) {
            clearInterval(timer);
            return;
          }
          if (typeof index !== "number") return;
          clearInterval(timer);
          if (variable && window.$gameVariables)
            window.$gameVariables.setValue(variable, index);
          if (typeof popupOptions.onResult === "function") {
            let label = null;
            if (index >= 0) {
              label = buttons.length ? buttons[index] || null : "OK";
            }
            try {
              popupOptions.onResult(index, label);
            } catch (e) {
              console.error(
                "[Native Popup] onResult threw an error: " + (e && e.message),
              );
            }
          }
        }, 100);
      }
      return true;
    } catch (e) {
      console.error("[Native Popup] showMessage failed: " + (e && e.message));
      return false;
    }
  };
})();
