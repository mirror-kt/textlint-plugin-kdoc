## textlint-plugin-kdoc

[![NPM Version](https://img.shields.io/npm/v/%40mirror-kt%2Ftextlint-plugin-kdoc)](https://www.npmjs.com/package/@mirror-kt/textlint-plugin-kdoc)

[textlint](https://textlint.org) plugin to support [kdoc](https://kotlinlang.org/docs/kotlin-doc.html)
comments.

### Installation

```shell
# npm
npm add -D @mirror-kt/textlint-plugin-kdoc

# yarn
yarn add -D @mirror-kt/textlint-plugin-kdoc

# pnpm
pnpm add -D @mirror-kt/textlint-plugin-kdoc
```

And write the following content in the textlint configuration file (e.x. `.textlintrc.json`).

```jsonc
{
  "plugins": {
    "@mirror-kt/textlint-plugin-kdoc": true
  },
  "rules": {
    // your rules...
  }
}
```

### License

This project is licensed under [MIT License](https://opensource.org/license/mit).