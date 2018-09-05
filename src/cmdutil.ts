#!/usr/bin/env node
import * as directline from './bridge';
import * as express from 'express';
import * as program from 'commander';

program
    .option('-c, --client <client>', 'The endpoint/port where your client lives (e.g. "http://127.0.0.1:3000")')
    .option('-b, --bot <bot>', 'The endpoint/port where your bot lives (e.g. "http://127.0.0.1:3978/api/messages")')
    .action(() => {
        const app = express();
        directline.initializeRoutes(app, program.client, program.bot);
    })
    .parse(process.argv);
