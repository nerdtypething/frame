'use strict';

const Glue = require('@hapi/glue');
const Manifest = require('./manifest');


process.on('unhandledRejection', (reason, promise) => {

    console.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

// rousr-mod: wrap in a module.exports so as
// to be able to pass in a rousr logger implementation

module.exports = {
    launchRousrFrameServer: async function(logger) {

        logger.log('rousr-frame server launchRousrFrameServer() start...', ['RSR-FRAME', 'WORKER', process.pid]);

        const options = { relativeTo: __dirname };
        const server = await Glue.compose(Manifest.get('/'), options);
        await server.start();

        logger.log('rousr-frame server listening on port ' + Manifest.get('/server/port'), ['RSR-FRAME', 'WORKER', process.pid]);
    }
}

// original Frame 14 implementation:
// const main = async function () {

//     const options = { relativeTo: __dirname };
//     const server = await Glue.compose(Manifest.get('/'), options);

//     await server.start();

//     console.log(`Server started on port ${Manifest.get('/server/port')}`);
// };

// main();
