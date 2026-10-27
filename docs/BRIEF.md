# Wuzzanext: build brief

The owner's brief of 2026-10-26, with internal hostnames replaced by role names. The name is
settled: **Wuzzanext** for the app, the project and the repository (owner, through the
orchestrator, 2026-10-26). The GitHub repository becomes `abadran101/wuzzanext`; the local
folder and project entry keep the old name.

## Overview

- **What it is:** a family app for assigning chores and planning meals.
- **Where it runs:** the owner's home server, reachable on the home network only.
- **How people use it:** in a web browser on desktop or phone, plus an Android app.
- **Look and feel:** fun and simple, with few options and little text. Icons and graphics
  wherever they fit.
- **Logo:** the owner's cartoon image (`assets/logo/logo-original.jpg`). Remove its background to
  make a transparent PNG, and use it for the app icon, the favicon and the Android launcher icon.

## Starting point

- Fork Donetick (github.com/donetick/donetick, web interface in github.com/donetick/frontend),
  rename it to Wuzzanext and apply the logo throughout.
- Donetick is AGPL-3.0. Keep the license and make the source available to users; a public
  repository covers this.
- Code goes to this repository. Work on feature branches; the owner merges.

## Users and sign-in

- Each family member has a profile with a name, avatar and color.
- Sign-in is a simple 4-digit PIN, with no heavy security; the data is harmless family
  information.
- A quick way to switch between people on a shared device such as a tablet.
- Anyone can assign tasks to anyone.

## Tasks (chores)

- Types: one-time and recurring.
- Content: pictures and text, namely instructions and what counts as done.
- Rotating chores: a chore can rotate automatically among people, for example every week.
- Photo proof: the person who completes a task can attach a "done" photo, and whoever assigned
  it approves it with a thumbs up.
- Points: finished tasks earn stars or points, and a simple weekly leaderboard shows the totals.
- Reminders: phone notifications when a task is due.

## Meal planning

- **Recipe source:** anyone can pick a recipe from the owner's local recipes page (on the home
  network, no sign-in, one child page per recipe, with dynamic serving controls).
- **Adding a meal:** meal type (breakfast, lunch, dinner, snack), date, time, number of servings,
  and the person who will cook it.
- **Meal polls:** anyone can start a poll, pick up to 3 recipes and the people included. Majority
  wins; on a tie the app picks one of the tied recipes at random.
- **To-do list:** the meal shows up in the cook's to-do list like any other task.
- **Week view:** a weekly meal plan the whole family can see.
- **Shopping list:** generated from the ingredients of planned meals.

## Android app

- Shared as a downloadable .apk file; no Play Store.
- Works away from home: the app keeps a copy of the data, so tasks and meals can be viewed off
  the home network.
- Changes made away from home are saved on the phone and sent once it reconnects to the home
  network.
- Conflicts: the default is that the most recent change wins (owner to confirm, or choose an
  alternative).
