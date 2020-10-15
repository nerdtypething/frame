'use strict';

const Account = require('../models/account');
const Boom = require('@hapi/boom');
// rousr-mod: using rsrConfigs
const Config = require('../../rsrConfig');
const Joi = require('@hapi/joi');
const Mailer = require('../mailer');
const Session = require('../models/session');
const User = require('../models/user');


const register = function (server, serverOptions) {

    server.route({
        method: 'POST',
        path: '/api/signup',
        options: {
            tags: ['api','signup'],
            description: 'Sign up for a new user account. [No Scope]',
            notes: 'Sign up for a new user account. Creates a new User, new Account, and links the two.',
            auth: false,
            validate: {
                payload: {
                    name: Joi.string().required(),
                    email: Joi.string().email().lowercase().required(),
                    username: Joi.string().email().lowercase().required(),
                    password: Joi.string().required(),
                    verificationCode: Joi.string().required()
                }
            },
            pre: [{
                assign: 'usernameCheck',
                method: async function (request, h) {

                    const user = await User.findByUsername(request.payload.username);

                    if (user) {
                        throw Boom.conflict('Username already in use.');
                    }

                    return h.continue;
                }
            }, {
                assign: 'emailCheck',
                method: async function (request, h) {

                    const user = await User.findByEmail(request.payload.email);

                    if (user) {
                        throw Boom.conflict('Email already in use.');
                    }

                    return h.continue;
                }
            }]
        },
        handler: async function (request, h) {

            // create and link account and user documents

            let [account, user] = await Promise.all([
                Account.create(request.payload.name),
                User.create(
                    request.payload.username,
                    request.payload.password,
                    request.payload.email
                )
            ]);

            [account, user] = await Promise.all([
                account.linkUser(`${user._id}`, user.username),
                user.linkAccount(`${account._id}`, account.fullName())
            ]);

            // send welcome email

            const emailOptions = {
                subject: `Your ${Config.get('/projectName')} account`,
                to: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };

            try {
                // rousr-mod: changed to 'rousr-welcome'
                await Mailer.sendEmail(emailOptions, 'rousr-welcome', request.payload);
            }
            catch (err) {
                request.log(['mailer', 'error'], err);
            }

            // create session

            const userAgent = request.headers['user-agent'];
            const ip = request.remoteAddress;
            const session = await Session.create(`${user._id}`, ip, userAgent);

            // create auth header

            const credentials = `${session._id}:${session.key}`;
            const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

            return {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles
                },
                session,
                authHeader
            };
        }
    });

    // rsr-mod: added this POST for resendVerification
    server.route({
        method: 'POST',
        path: '/api/resendVerification',
        options: {
            auth: false,
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required(),
                    verificationCode: Joi.string().required()
                }
            }
        },
        handler: async function (request, reply) {

            const emailOptions = {
                subject: 'Verify Your ' + Config.get('/projectName') + ' Account',
                to: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };

            try {
                await Mailer.sendEmail(emailOptions, 'rousr-resend-verification', request.payload);
            }
            catch (err) {
                request.log(['mailer', 'error'], err);
            }
        }
    });
};


module.exports = {
    name: 'api-signup',
    dependencies: [
        'hapi-mongo-models',
        'hapi-remote-address'
    ],
    register
};
