# MetaProcess

Diploma project repository.

## List of techs

1. [Electron](https://www.electronjs.org/)
2. [Prisma](https://www.prisma.io/)
3. [TS](https://www.typescriptlang.org/)
4. [Cytoscape.js](https://js.cytoscape.org/)

## Development build & run instructions

1. Install required modules: `npm install`

2. Run start script: `npm start`

## Production build instructions

1. Install required modules: `npm install`

2. Run **pack** *(bundle only)* or **dist** *(produce installer)* script: `npm run pack` or `npm run script`

3. Build output files location: `./build`

## Database information

Init database version is located at `./db`.

For test dev builds it's possible to use another database in custom location, edit `DATABASE_PRISMA_URL` env variable (path should be relative to `prisma\schema.prisma`). **Note:** `DATABASE_PRISMA_URL` should have default value before production builds.

After OS installation database file may be replcaed with a custom one at the app data folder (OS specific), see: [appData paths](https://www.electronjs.org/docs/api/app#appgetpathname)

## Prebuild versions

Currently available prebuild installers:

| OS            | Version       |
| ------------- |:-------------:|
| Win 10        | 1.0.0         |
| Ubuntu 16.04  | 1.0.0         |
