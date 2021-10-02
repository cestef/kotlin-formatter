# Kotlin-Formatter for VSCode

This is just a formatter for Kotlin (`.kt`) and KotlinScript (`.kts`)

## Requirements

### macOS / Linux

Make sure you have [ktlint](https://github.com/pinterest/ktlint#installation) installed before installing this extension

### Windows

You need the [ktlint jar](https://github.com/pinterest/ktlint/releases) file and either have it in your project root or specify its location in the vscode settings (`ktlintPath`)


## Using

You can either use the `kotlin-formatter.formatKotlin` command or set `cstef.kotlin-formatter` as your default formatter in VScode settings

## Format on save

Set `cstef.kotlin-formatter` as your formatter for `kotlin` and/or `kotlinscript` in VScode's `settings.json`:

```json
    {
        ...
        "[kotlin]": {
            "editor.defaultFormatter": "cstef.kotlin-formatter"
        },
        "[kotlinscript]": {
            "editor.defaultFormatter": "cstef.kotlin-formatter"
        }
        ...
    }
```
