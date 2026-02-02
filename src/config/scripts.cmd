npx node-pg-migrate up --f config/prod_db.json
npx node-pg-migrate up --f config/dev_db.json

sudo journalctl -u gspot.service -n 100 -o cat | grep -i "error"