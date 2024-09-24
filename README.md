# Dpl Backend
Our system to manage user accounts and deployments for Xnode studio.
Will be granfathered out later when a more distributed architecture can be found.


## Run

```
npm install
npx prisma generate
npm run build
npm run start:prod
```

## Update the database

```
npx prisma generate
npm run build
npx prisma migrate dev
npx prisma migrate deploy
```
