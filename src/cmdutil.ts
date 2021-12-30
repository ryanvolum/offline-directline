#!/usr/bin/env node
import { Command, Option } from 'commander';
import * as express from 'express';
import * as directline from './bridge';
require("dotenv").config()

const DEFAULT_DIRECTLINE = "http://127.0.0.1";
const DEFAULT_PORT = "3001";
const DEFAULT_BOT = "http://127.0.0.1:3978/api/messages";

const program = new Command();

program
    .addOption(new Option('-d, --directline <directline>', 'The endpoint where offline-directline will run without port information').default(DEFAULT_DIRECTLINE).env('DIRECTLINE_ENDPOINT'))
    .addOption(new Option('-p, --port <port>', 'The port where offline-directline will listen').default(DEFAULT_PORT).env('DIRECTLINE_PORT'))
    .addOption(new Option('-b, --bot <bot>', 'The endpoint/port where your bot lives').default(DEFAULT_BOT).env('BOT_URL'))
    .action((options, command) => {
        console.log(options);
        if (options.directline && options.bot) {
            const app = express();
            directline.initializeRoutes(app, options.directline, options.port, options.bot);
        } else {
            console.log('offline-directline requires you to pass the endpoint where it will be hosted on and the endpoint where your bot lives (e.g. "directline -d http://127.0.0.1:3000 -b http://127.0.0.1:3978/api/messages")');
        }
    })
    .parse(process.argv);

