# Vue migration

## Experiences

v-show to display a dialog will not work

All these don't work. It's a W3.CSS issue.

The issue is that v-show only toggles display: none, but W3.CSS modals need display: block to appear. The modal div has class w3-modal which has display: none by default, and v-show="true" removes the inline style but doesn't set display: block.

```
<div v-show="showEditUserModal" class="w3-modal">
<div v-show="showEditUserModal" class="w3-modal" :style="{ display: showEditUserModal ? 'block' : 'none' }">
<div class="w3-modal" :style="{ display: showEditUserModal ? 'block' : 'none' }">
```

This works
```
<div class="w3-modal" :style="{ display: showEditUserModal ? 'block' : 'none' }">
```
