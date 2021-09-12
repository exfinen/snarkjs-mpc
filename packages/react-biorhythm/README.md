# react-biorhythm

Fun component to show a biorhythm graph

## Usage

```typescript
<Biorhythm
  birthday={birthday}
  width={100}  // character width of the chart
  height={50}  // character height of the chart
  daysBeforeToday={20}  // days to show before today in chart
  daysAfterToday={30}  // days to show after today in chart
/>
```

## Formula used
<img src="https://latex.codecogs.com/gif.latex?\sin (\frac{2{\pi}t}{T})" />

where T is the period of one of the below cycles

| Period | Cycle Type |
|--------|------------|
| 23 | Physical |
| 28 | Emotional |
| 33 | Intellectual |

and t is the number of days since birth i.e. t = today - birthday

## Wiki
https://en.wikipedia.org/wiki/Biorhythm_(pseudoscience)
