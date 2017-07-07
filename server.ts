import * as express from 'express';
import bodyParser = require('body-parser');

export class RestServer {
    router: express.server;

    constructor(name: string) {
        this.router = express.createServer({
            name: name
        });

        this.router.on('listening', () => {
            console.log(`${this.router.name} listening on ${this.router.url}`);
        });

        this.router.use(bodyParser.json()); // for parsing application/json
        this.router.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
        this.router.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
            next();
        });
    }
    public restart() {
        this.stop();
        return this.router.listen();
    }

    public stop() {
        return this.router.close();
    }
}