'use strict';
const Confidence = require('confidence');
const Dotenv = require('dotenv');
const rsrSharedConfig = require('rousr-shared').Config.SharedConfig;

Dotenv.config({ silent: true });

const criteria = {
    rsrConfig: process.env.RSR_CONFIG,
    rsrApiImplementation: process.env.RSR_API_IMP
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
            user: 'social@rousr.io',
            pass: 'L3fthandfree'
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
