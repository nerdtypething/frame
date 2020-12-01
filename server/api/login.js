'use strict';

const AuthAttempt = require('../models/auth-attempt');
const Bcrypt = require('bcrypt');
const Boom = require('@hapi/boom');
// rousr-mod: using rsrConfig
const Config = require('../../rsrConfig');
const Joi = require('@hapi/joi');
const Mailer = require('../mailer');
const Session = require('../models/session');
const User = require('../models/user');

// rousr-mod: requiring rousr-shared shared config
const rsrSharedConfig = require('rousr-shared').Config.SharedConfig;


const register = function (server, serverOptions) {

    server.route({
        method: 'POST',
        path: '/api/login',
        options: {
            tags: ['api','login'],
            description: 'Log in with username and password. [No Scope]',
            notes: 'Log in with username and password.',
            auth: false,
            validate: {
                payload: {
                    username: Joi.string().lowercase().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'abuseDetected',
                method: async function (request, h) {

                    const ip = request.remoteAddress;
                    const username = request.payload.username;
                    const detected = await AuthAttempt.abuseDetected(ip, username);

                    if (detected) {
                        throw Boom.badRequest('Maximum number of auth attempts reached.');
                    }

                    return h.continue;
                }
            }, {
                assign: 'user',
                method: async function (request, h) {

                    const ip = request.remoteAddress;
                    const username = request.payload.username;
                    const password = request.payload.password;
                    const user = await User.findByCredentials(username, password);

                    if (!user) {
                        await AuthAttempt.create(ip, username);

                        throw Boom.badRequest('Credentials are invalid or account is inactive.');
                    }

                    return user;
                }
            }, {
                assign: 'session',
                method: async function (request, h) {

                    const userId = `${request.pre.user._id}`;
                    const ip = request.remoteAddress;
                    const userAgent = request.headers['user-agent'];

                    return await Session.create(userId, ip, userAgent);
                }
            }]
        },
        handler: function (request, h) {

            const sessionId = request.pre.session._id;
            const sessionKey = request.pre.session.key;
            const credentials = `${sessionId}:${sessionKey}`;
            const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

            return {
                user: {
                    _id: request.pre.user._id,
                    username: request.pre.user.username,
                    email: request.pre.user.email,
                    roles: request.pre.user.roles
                },
                session: request.pre.session,
                authHeader
            };
        }
    });


    server.route({
        method: 'POST',
        path: '/api/login/forgot',
        options: {
            tags: ['api','login'],
            description: 'Trigger forgot password email. [No Scope]',
            notes: 'Trigger forgot password email.',
            auth: false,
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [{
                assign: 'user',
                method: async function (request, h) {

                    const query = { email: request.payload.email };
                    const user = await User.findOne(query);

                    if (!user) {
                        const response = h.response({ message: 'Success.' });

                        return response.takeover();
                    }

                    return user;
                }
            }]
        },
        handler: async function (request, h) {

            // set reset token

            const keyHash = await Session.generateKeyHash();

            // rousr-mod: using the rousr-shared reset password token expire
            // value.
            const msPerMinute = 60000;
            const expiresInMins = rsrSharedConfig.get('/auth/reset_pw_token_expires_minutes')
            const update = {
                $set: {
                    resetPassword: {
                        token: keyHash.hash,
                        expires: new Date(Date.now() + expiresInMins * msPerMinute)
                    }
                }
            };

            await User.findByIdAndUpdate(request.pre.user._id, update);

            // send email
            // rousr-mod: using the rousr email template and adding
            // the expires value
            const projectName = Config.get('/projectName');
            const emailOptions = {
                subject: `Reset your ${projectName} password`,
                to: request.payload.email
            };
            const template = 'rousr-forgot-password';
            const context = { 
                key: keyHash.key,
                keyExpireMins: expiresInMins
            };

            await Mailer.sendEmail(emailOptions, template, context);

            return { message: 'Success.' };
        }
    });


    server.route({
        method: 'POST',
        path: '/api/login/reset',
        options: {
            tags: ['api','login'],
            description: 'Reset password with forgot password key. [No Scope]',
            notes: 'Reset password with forgot password key.',
            auth: false,
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required(),
                    key: Joi.string().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'user',
                method: async function (request, h) {

                    // note: the original frame implementation
                    // used a $gt parameter against the expiration date.
                    // this didn't work since the date in mongo was an
                    // ISO date and we were comparing against Date.now()
                    // which seemed to have an incompatible format. 
                    // https://stackoverflow.com/questions/2943222/find-objects-between-two-dates-mongodb
                    // instead we just bring in the user object which
                    // serializes the expiration date into a format compatible
                    // with the JS Date object. then we can do our comparison
                    // in code.
                    // const query = {
                    //     email: request.payload.email,
                    //     'resetPassword.expires': { $gt: Date.now() }
                    // };

                    const query = {
                        email: request.payload.email,
                    };

                    const user = await User.findOne(query);

                    if (!user) {
                        throw Boom.badRequest('Invalid email.');
                    }

                    // rousr-mod: added this if
                    if (user) {
                        if (user.resetPassword == null) {
                            return reply(Boom.badRequest('You can\'t reset your password at this time.'));
                        }
                        
                        var keyExpirationDate = user.resetPassword.expires;
                        if (keyExpirationDate <= Date.now()) {
                            return reply(Boom.badRequest('Key has expired.'));
                        }
                    }

                    return user;
                }
            }]
        },
        handler: async function (request, h) {

            // validate reset token

            const key = request.payload.key;
            const token = request.pre.user.resetPassword.token;
            const keyMatch = await Bcrypt.compare(key, token);

            if (!keyMatch) {
                throw Boom.badRequest('Invalid key.');
            }

            // update user

            const password = request.payload.password;
            const passwordHash = await User.generatePasswordHash(password);
            const update = {
                $set: {
                    password: passwordHash.hash
                },
                $unset: {
                    resetPassword: undefined
                }
            };

            await User.findByIdAndUpdate(request.pre.user._id, update);

            return { message: 'Success.' };
        }
    });
};


module.exports = {
    name: 'api-login',
    dependencies: [
        'hapi-mongo-models',
        'hapi-remote-address'
    ],
    register
};
