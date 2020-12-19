'use strict';
const Confidence = require('confidence');
const Dotenv = require('dotenv');
const rsrSharedConfig = require('rousr-shared').Config.SharedConfig;
const RousrFrameSecured = require('./RousrFrameSecured');

Dotenv.config({ silent: true });

// recall this path is relative to the current working directory
// of this module (rousr-fork-frame-14).
var frameSecureObject = new RousrFrameSecured('./RsrFrameSwazz.json');
var frameSecureData = frameSecureObject.getSecureData();

const criteria = {
    rsrConfig: process.env.RSR_CONFIG
};

// rousr-mod: added an options object to the hapiMongoModels.mongodb object
// see: https://mongoosejs.com/docs/deprecations.html
const config = {
    $meta: 'This file configures the plot device.',
    projectName: 'Rousr',
    port: {
        web: {
            $filter: 'rsrConfig',
            prod: 9090,
            test: 9090,
            dev: 9090,
            $default: 9000
        }
    },
    authAttempts: {
        forIp: 50,
        forIpAndUser: 7
    },
    hapiMongoModels: {
        mongodb: {
            connection: {
                uri: {
                    $filter: 'rsrConfig',
                    prod: 'mongodb+srv://' + 
                            rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/user') + 
                            ':' + rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/password') + 
                            '@rousr-c0.vffd9.mongodb.net/projectwoke',
                    test: 'mongodb+srv://' + 
                            rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/user') + 
                            ':' + rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/password') + 
                            '@rousr-c0.vffd9.mongodb.net/projectwoke',
                    dev: 'mongodb+srv://' + 
                            rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/user') + 
                            ':' + rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/password') + 
                            '@rousr-c0.vffd9.mongodb.net/projectwoke',
                    $default: 'mongodb+srv://' + 
                                rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/user') + 
                                ':' + rsrSharedConfig.get('/rousrApi/userDataSource/authCreds/password') + 
                                '@rousr-c0.vffd9.mongodb.net/projectwoke'
                },
                db: {
                    $filter: 'rsrConfig',
                    prod: 'projectwoke',
                    test: 'projectwoke',
                    dev: 'projectwoke',
                    $default: 'projectwoke'
                }
            },
            options: {useUnifiedTopology: true}
        },
        autoIndex: false
    },
    nodemailer: {
        host: 'smtp.dreamhost.com',
        port: 465,
        secure: true,
        auth: {
            user: frameSecureData.dev.username,
            pass: frameSecureData.dev.password
        }
    },
    system: {
        fromAddress: {
            name: 'Rousr',
            address: 'social@rousr.io'
        },
        toAddress: {
            name: 'Rousr',
            address: 'social@rousr.io'
        }
    },
    api: {
      prefix: '/api/int/frame'
    }
};

const store = new Confidence.Store(config);

exports.get = function (key) {
    return store.get(key, criteria);
};

exports.meta = function (key) {
    return store.meta(key, criteria);
};
