# Breakpoint Sync

Simply synchronises breakpoints between windows.

Why? My codebase is large, so to keep searches, etc. manageable, I tend to have windows open for each module. When it comes to debugging, it's usually from the main window module and quite often I find the file I want to break in is open in another window. By synchroning the breakpoints, I no longer need to drag files between windows.

It uses global storage to store a copy of all the breakpoints. When a breakpoint is changed, the global storage is updated. When a window is activated, it updates it's breakpoints to match the global storage.

## Installing

You can install the latest version of the extension via the Visual Studio Marketplace [here](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.breakpoint-sync).

### Source Code

The source code is available on GitHub [here](https://github.com/Gruntfuggly/breakpoint-sync).

## Configuration

`breakpoint-sync.debug` (default:`false`)

Set to true to create a debug channel in the output view

`breakpoint-sync.globs` (default:`[]`)
An array of globs to match. If empty, all breakpoints are synchronised, otherwise only files which match one of the glob patterns will be synchronised.

## Commands

If you update the globs setting, or experience other issues, you can show the currently cached breakpoints with *Breakpoint Sync: Show Cache* and clear the cache with *Breakpoint Sync: Reset Cache*.

## Output

If configured, an output channel is created in the Output View. If the extension doesn't seem to be doing what you expect, please check the contents of the output channel.
