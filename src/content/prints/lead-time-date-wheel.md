---
title: "A Date Wheel for Construction Lead Times"
description: "A printed, spin-to-read date calculator my brother asked for: line up a start date, read the arrival date N weeks out. One line of geometry keeps the math exact."
date: "2026-06-10"
tags: ["3D Printing", "OpenSCAD", "Tools"]
image: "/prints/lead-time-date-wheel/first-print.jpg"
---

My brother works in construction. Something on a job is "14 weeks out," and he wants to know what date that actually lands on: the exact day, not a rough guess. Usually that means counting squares on a wall calendar or poking at a phone. He asked if I could just make him a physical thing that does it. So I did: a date wheel you set once and read off.

![Photo of the first print held in one hand: a white disc with espresso-brown embossed markings. The inner ring carries JAN through DEC, the outer rim is numbered in weeks from 4 to 52, and a small index arrow sits at the top](/prints/lead-time-date-wheel/first-print.jpg)

It's a [volvelle](https://en.wikipedia.org/wiki/Volvelle), the rotating paper-calculator dial, reworked in plastic. The idea is lifted from the [OTIS "Date Calculator" double wheel](https://www.barkershops.com/otis/details.aspx?pn=OTIS169&cat=37), but rebuilt as a single rotor turning inside a fixed base.

## How it works

Two parts. A **rotor** carries a full 365-day calendar: month names and day ticks. It spins inside a fixed **base** whose rim is a **52-week lead-time scale**, with one index arrow at the top.

The whole thing comes out of a single line of [OpenSCAD](https://openscad.org/):

```openscad
function day_angle(d) = 90 - d * 360 / 365;   // day 0 = Jan 1 at top, clockwise
```

Every angular feature is placed with that one function. Each day tick sits at `day_angle(D)`, each week number at `day_angle(7N)`, so week mark *N* lands at the same angle as calendar day *7N* by construction, not because I eyeballed it. "N weeks" is 7N days on the dial, with none of the accumulating drift you'd get from placing 52 marks by hand.

Two details I had to make a call on:

- **The year-end long week.** 52 x 7 = 364, but the year is 365, so one interval straddling Dec 31 / Jan 1 spans 8 days instead of 7. It only nudges the spacing you read right around New Year.
- **Leap years.** The rim is a fixed 365-day calendar, so Feb 29 has no tick, and a lead time that crosses it reads one day short. Rather than crowd the rim with a second scale, there's just a small `LEAP +1` reminder engraved by late February.

## How you use it

![Top-down view of the assembled wheel: the inner rotor shows JAN through DEC with fine day ticks, the outer base rim is numbered 4, 8, 12 ... 52 in weeks, and an index arrow sits at 12 o'clock](/prints/lead-time-date-wheel/assembly-top.png)

**Forward, the usual direction (start date to arrival date):**

1. Spin the rotor until your order date lines up with the fixed arrow at the top.
2. Read the date now sitting under the week mark for your lead time. A lead time of 8 weeks reads off the `8` mark. That's your arrival date.

**Backward (deadline to latest order date):**

1. Put your required-by date under the arrow.
2. Count *back* N weeks to find the latest date you can still place the order and make it.

That's the whole interface.

## The first print

The photo at the top is the first one off the bed: white body, espresso marks. It prints flat in two parts with no supports, and the embossed labels come through via a mid-print filament change in the top few layers, which is why they read as a clean second colour rather than a scratched-in surface. The wheel is about 150 mm across.
