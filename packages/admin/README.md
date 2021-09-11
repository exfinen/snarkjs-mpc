# Admin

## Setting up a ceremony in firebase store
1. Edit config/default.ts for the ceremony to add

2. Run add-ceremony script
   ```shell
   $ npm run add-ceremony
   ```

Note that this only adds directory structure and the ceremony configuration.
In addtion to that, one ptau file shared among circuits needs to be added and also one r1cs file needs to be added to each circuit.

## Adding shared ptau file to firebase storage
```shell
$ npm run add-ptau [file path]
```

## Adding circuit r1cs file to firebase storage
```shell
$ npm run add-r1cs [circuitDir] [file path]
```

## Setting the current ceremony
Multiple ceremonies can be stored in firestore/storage, but only one ceremony can be active at a time.
Below command sets the active ceremony.

```shell
$ npm run set-current-ceremony [new-ceremony-id]
```

## Removing a ceremony from firebase store
Not supported. Can be done using Firebase GUI
