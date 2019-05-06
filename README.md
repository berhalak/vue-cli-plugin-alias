# vue-cli-plugin-alias
Aliasing common html code in vue template.

This plugin lets you create macros or aliases in your *.vue files

Installation:
vue add vue-cli-plugin-alias

Or through vue ui, search for vue-cli-plugin-alias

Sample (also see test.ts)

Transforms vue template from alias form:
```
<template alias>
  <div>
    <define item>
      <div class="item" style="color: red" />
    </define>
    <a-header />
    <item />
  </div>
</template>
```
To:
```
<template alias>
  <div>
    <div class="a-header" />
    <div class="item" style="color: red" />
  </div>
</template>
```
